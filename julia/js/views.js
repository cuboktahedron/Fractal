-'use strict';

class MainView {
  constructor(urlParams) {
    const paramView = new ParameterView();
    paramView.init(urlParams);

    const canvasView = new CanvasView(paramView);
    canvasView.init();

    const operationView = new OperationView(paramView);
    operationView.init();

    const colorsetsView = new ColorsetsView();
    colorsetsView.init(urlParams);

    const snapshotsView = new SnapshotsView(paramView);
    snapshotsView.init();

    const noticeView = new NoticeView();
    noticeView.init();
  }
}

class CanvasView {
  constructor(paramView) {
    this._paramView = paramView;

    this.$canvas = document.getElementById('canvas');
    this._ctx = this.$canvas.getContext('2d');
    this.$backCanvas = document.createElement('canvas');
    this.$backCanvas.width = canvas.width;
    this.$backCanvas.height = canvas.height;
    this._backCtx = this.$backCanvas.getContext('2d');
    this._refreshCanceling = false;
  }

  init() {
    const that = this;

    setInterval(function() {
      that._refreshLoop();
    }, 100);

    this._addMouseEvent();

    eventer.on('changeColor', function(colorIndex) {
      that._colorIndex = colorIndex;
      eventer.emit('refresh');
    }, this);

    eventer.on('refresh', this._refresh, this);
  }

  _addMouseEvent() {
    const that = this;
    let downed = -1;
  
    this.$canvas.oncontextmenu = function() {
      return false;
    }
  
    this.$canvas.onmousedown = function(ev) {
      downed = ev.button;
    }
  
    this.$canvas.ondblclick = function(ev) {
      const centerX = that._paramView.centerX();
      const centerY = that._paramView.centerY();
      const zoom = that._paramView.zoom();
      const diffX = ev.layerX - (that.$canvas.clientWidth / 2);
      const diffY = ev.layerY - (that.$canvas.clientHeight / 2);
      const newCenterX = centerX + ((diffX / (that.$canvas.clientWidth / 2)) * (100 / zoom)); 
      const newCenterY = centerY + ((diffY / (that.$canvas.clientHeight / 2)) * (100 / zoom));
  
      that._paramView.centerX(newCenterX);
      that._paramView.centerY(newCenterY);
  
      eventer.emit('refresh');
    }
  
    this.$canvas.onmousemove = function(ev) {
      if (downed !== 0 && downed !== 2) {
        return;
      }
  
      const centerX = that._paramView.centerX();
      const centerY = that._paramView.centerY();
      const csre = that._paramView.csre();
      const csim = that._paramView.csim();
      const zoom = that._paramView.zoom();
  
      if (downed === 0) { // left button
        const  newCenterX = centerX - ((ev.movementX / (that.$canvas.clientWidth / 2)) * (100 / zoom)); 
        const newCenterY = centerY - ((ev.movementY / (that.$canvas.clientHeight / 2)) * (100 / zoom));
        that._paramView.centerX(newCenterX);
        that._paramView.centerY(newCenterY);
  
        eventer.emit('refresh', true);
        return;
      }
  
      if (downed === 2) { // right button
        const newCsre = csre + (ev.movementX / (zoom * 10));
        const newCsim = csim + (ev.movementY / (zoom * 10));
        that._paramView.csre(newCsre);
        that._paramView.csim(newCsim);
  
        eventer.emit('refresh', true);
  
        return;
      }
    }
  
    this.$canvas.onmouseup = function(ev) {
      if (downed !== ev.button) {
        return;
      }
    
      downed = -1;
  
      eventer.emit('refresh');
    }
  
    this.$canvas.onmousewheel = function(ev) {
      const centerX = that._paramView.centerX();
      const centerY = that._paramView.centerY();
      const diffX = ev.layerX - (that.$canvas.clientWidth / 2);
      const diffY = ev.layerY - (that.$canvas.clientHeight / 2);
      const px = centerX + ((diffX / (that.$canvas.clientWidth / 2)) * (100 /  that._paramView.zoom())); 
      const py = centerY + ((diffY / (that.$canvas.clientHeight / 2)) * (100 /  that._paramView.zoom()));
  
      if (ev.wheelDelta > 0) {
        that._paramView.zoomIn();
      } else {
        that._paramView.zoomOut();
      }
  
      const newCenterX = px - ((diffX / (that.$canvas.clientWidth / 2)) * (100 / that._paramView.zoom())); 
      const newCenterY = py - ((diffY / (that.$canvas.clientHeight / 2)) * (100 / that._paramView.zoom()));
      that._paramView.centerX(newCenterX);
      that._paramView.centerY(newCenterY);
  
      eventer.emit('refresh', true);
      setTimeout(function() {
        eventer.emit('refresh');
      }, 200);

      ev.preventDefault();
    }
  }

  async _refresh(rough) {
    let resolution = this._paramView.resolution();
    if (rough && resolution > 100) {
      resolution = 100;
    }

    const params = {
      cs: new Complex(this._paramView.csre(), this._paramView.csim()),
      center: new Complex(this._paramView.centerX(), this._paramView.centerY()),
      zoom: this._paramView.zoom(),
      resolution: resolution,
      maxRepeat: this._paramView.maxRepeat(),
      skip: this._paramView.skip(),
      colorIndex: this._colorIndex,
      rough: !!rough,
    };

    if (this._refreshing) {
      this._refreshCanceling = true;
    }
    this._nextRefreshParam = params;
  }

  async _refreshLoop() {
    if (this._refreshing) {
      return;
    }

    if (this._nextRefreshParam) {
      this._refreshing = true;
      const refreshParams = this._nextRefreshParam;
      this._nextRefreshParam = null;

      if (refreshParams.rough) {
        await this._refreshRoughly(refreshParams);
      } else {
        await this._refreshNotRoughly(refreshParams);
      }
      this._refreshing = false;
      this._refreshCanceling = false;
    }
  }

  async _refreshNotRoughly(params) {
    const that = this;

    const elapsedTime = await Diagnosis.elapsedTime(async function() {
      const julia = await that._calculation(params);
      if (that._refreshCanceling) {
        return;
      }
      await that._draw(julia, params.resolution);
    });

    if (that._refreshCanceling) {
      return;      
    }

    let sec = elapsedTime / 1000.0;
    eventer.emit('changeNotice', 'processing time: ' + sec + 'sec');
  }

  async _refreshRoughly(params) {
    eventer.emit('changeNotice', 'drawing roughly...');
    const julia = await this._calculation(params);
    await this._drawRoughly(julia, params.resolution);
  }
  
  async _calculation(param) {
    const worker = WorkerUtils.createWorker('js/worker.js');
    const workerParam = Object.assign({}, param);
    workerParam.href = window.location.href;

    let julia = null;
    worker.postMessage(workerParam);
    worker.onmessage = function(e) {
      if (e.data.end) {
        julia = e.data.output;
      } else if (!param.rough) {
        eventer.emit('changeNotice', e.data.progress);
      }
    };

    while (true) {
      await Process.sleep(10);
      if (julia || (!param.rough && this._refreshCanceling)) {
        worker.terminate();
        return julia;
      }
    }
  }

  _colorset() {
    return colorPalettes[this._colorIndex].colors;
  }
  
  _clear() {
    this._backCtx.fillStyle = colorPalettes[this._colorIndex].background;
    this._backCtx.fillRect(0, 0, this.$backCanvas.width, this.$backCanvas.height);
  }

  async _draw(julia, resolution) {
    this._clear();

    eventer.emit('changeNotice', 'drawing... 0%');

    let prevProgress = 0;
    for (let y = 0; y < julia.length; y++) {
      if (this._refreshCanceling) {
        return;
      }

      let progress = Math.floor((y / julia.length) * 100);
      this._draw2(julia, y, resolution)
      if (progress - prevProgress >= 5) {
        eventer.emit('changeNotice', 'drawing... ' + progress + '%');
        await Process.sleep(0);
        prevProgress = progress;
      }
    }

    if (this._refreshCanceling) {
      return;
    }

    eventer.emit('changeNotice', 'drawing... 99%');
    await Process.sleep(0);
    this._ctx.drawImage(this.$backCanvas, 0, 0, this.$backCanvas.width, this.$backCanvas.height);
  }

  async _drawRoughly(julia, resolution) {
    this._clear();

    for (let y = 0; y < julia.length; y++) {
      this._draw2(julia, y, resolution)
    }

    this._ctx.drawImage(this.$backCanvas, 0, 0, this.$backCanvas.width, this.$backCanvas.height);
  }

  _draw2(julia, y, resolution) {
    const maxRepeat = this._paramView.maxRepeat();
    const skip = this._paramView.skip();
    const colors = this._colorset();
    const block = this.$canvas.width / resolution;

    for (let x = 0; x < julia.length; x++) {
      let n = julia[y][x];
      if (n < skip) {
        continue;
      } else if (n == maxRepeat) {
        this._backCtx.fillStyle = colorPalettes[this._colorIndex].background2;
      } else {
        this._backCtx.fillStyle = colors[n % colors.length];
      }
      this._backCtx.fillRect(x * block, y * block, block, block);
    }
  }
};

class NoticeView {
  constructor() {
    this.$notice = document.getElementById('notice');
  }

  init() {
    eventer.on('changeNotice', this.changeNotice, this);
  }

  changeNotice(notice) {
    this.$notice.innerText = notice;
  }

  time() {
    if (arguments.length === 0) {
      return 
    } else {
      let value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      }

      let sec = value / 1000.0;
      this.$notice.innerText = 'processing time: ' + sec + 'sec';
    }
  }
};

class ParameterView {
  constructor() {
    this.$centerX = document.getElementById('center-x');
    this.$centerY = document.getElementById('center-y');
    this.$csre = document.getElementById('cs-re');
    this.$csim = document.getElementById('cs-im');
    this.$zoom = document.getElementById('zoom');
    this.$resolution = document.getElementById('resolution');
    this.$maxRepeat = document.getElementById('max-Repeat');
    this.$skip = document.getElementById('skip');
  }

  init(params) {
    this.csre(params.csre);
    this.csim(params.csim);
    this.centerX(params.ctre);
    this.centerY(params.ctim);
    this.zoom(params.zm);
    this.resolution(params.rs);
    this.maxRepeat(params.rp);
    this.skip(params.sp);
  }

  centerX() {
    if (arguments.length === 0) {
      return +this.$centerX.value;
    } else {
      let value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      }

      this.$centerX.value = value;
    }
  }

  centerY() {
    if (arguments.length === 0) {
      return +this.$centerY.value;
    } else {
      let value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      }

      this.$centerY.value = value;
    }
  }

  csre() {
    if (arguments.length === 0) {
      return +this.$csre.value;
    } else {
      let value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      }

      this.$csre.value = value;
    }
  }

  csim() {
    if (arguments.length === 0) {
      return +this.$csim.value;
    } else {
      let value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      }

      this.$csim.value = value;
    }
  }

  centerY() {
    if (arguments.length === 0) {
      return +this.$centerY.value;
    } else {
      let value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      }

      this.$centerY.value = value;
    }
  }

  zoom() {
    if (arguments.length === 0) {
      return +this.$zoom.value;
    } else {
      let value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      } else if (value <= 0) {
        value = 1;
      }

      this.$zoom.value = value;
    }
  }

  resolution() {
    if (arguments.length === 0) {
      return +this.$resolution.value;
    } else {
      let value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      } else if (value >= 2400) {
        value = 2400;
      } else if (value <= 0) {
        value = 1;
      }

      this.$resolution.value = value;
    }
  }

  maxRepeat() {
    if (arguments.length === 0) {
      return +this.$maxRepeat.value;
    } else {
      let value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      } else if (value >= 10000) {
        value = 10000;
      } else if (value <= 0) {
        value = 1;
      }

      this.$maxRepeat.value = value;
    }
  }

  skip() {
    if (arguments.length === 0) {
      return +this.$skip.value;
    } else {
      let value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      } else if (value < 0) {
        value = 0;
      }

      this.$skip.value = value;
    }
  }

  zoomIn() {
    const zoom = this.zoom();
    let value = Math.floor(zoom * Math.sqrt(2))
    if (value === zoom) {
      value++;
    }

    this.zoom(value);
  }

  zoomOut() {
    const zoom = this.zoom();
    let value = Math.floor(zoom / Math.sqrt(2))
    if (value === zoom) {
      value--;
    }

    this.zoom(value);
  }
};

class OperationView {
  constructor(paramView) {
    this._paramView = paramView;

    this.$fullScreen = document.getElementById('op-fullscreen');
    this.$save = document.getElementById('op-save');
    this.$download = document.getElementById('op-download');
    this.$url = document.getElementById('op-url');
    this.$txUrl = document.getElementById('tx-url');
  }

  init() {
    const that = this;

    eventer.on('changeColor', function(colorIndex) { this._colorIndex = colorIndex; }, this);

    this.$fullScreen.onclick = function() {
      canvas.requestFullscreen();
    }

    this.$save.onclick = function() {
      const data = {};

      data.imageUrlData = canvas.toDataURL();
      data.params = {
        cs: new Complex(that._paramView.csre(), that._paramView.csim()),
        center: new Complex(that._paramView.centerX(), that._paramView.centerY()),
        zoom: that._paramView.zoom(),
        resolution: that._paramView.resolution(),
        maxRepeat: that._paramView.maxRepeat(),
        skip: that._paramView.skip(),
        colorIndex: that._colorIndex,
      };

      eventer.emit('addSnapshot', data);
    }

    this.$download.onclick = function() {
      const filename = "cs_" + that._paramView.csre() + '+' + that._paramView.csim() + 'i '
        + "ct_" + that._paramView.centerX() + '+' + that._paramView.centerY() + 'i '
        + "zm_" + that._paramView.zoom() + ' '
        + "rs_" + that._paramView.resolution() + ' '
        + "rp_" + that._paramView.maxRepeat() + ' '
        + "sp_" + that._paramView.skip() + ' ';

      const a = document.createElement('a');

      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          a.href = URL.createObjectURL(blob);
          a.download = filename + '.png';
          a.click();
        });
      } else if (canvas.msToBlob) {
        a.href = URL.createObjectURL(canvas.msToBlob());
        a.download = filename + '.png';;
        a.click();
      } else {
        a.href = canvas.toDataURL('image/png');
        a.download = filename;
        a.click();
      }
    }

    this.$url.onclick = function() {
      const params = [];
      params.push('csre=' + that._paramView.csre());
      params.push('csim=' + that._paramView.csim());
      params.push('ctre=' + that._paramView.centerX());
      params.push('ctim=' + that._paramView.centerY());
      params.push('zm=' + that._paramView.zoom());
      params.push('rs=' + that._paramView.resolution());
      params.push('rp=' + that._paramView.maxRepeat());
      params.push('sp=' + that._paramView.skip());
      params.push('ci=' + that._colorIndex);

      const url = location.href.replace(/\?.*/, '') + '?' + params.join('&');
      that.$txUrl.value = url;
      that.$txUrl.select();
      document.execCommand('copy')
    }
  }
};

class ColorsetsView {
  constructor() {
    this.$colorsets = document.getElementById('colorsets');
    this.$colors = document.getElementById('sel-colors');
  }

  init(params) {
    const that = this;
    for(let i = 0; i < colorPalettes.length; i++) {
      const option = document.createElement('option');
      option.innerText = colorPalettes[i].name;
      option.value = i;
      this.$colors.appendChild(option);
    }

    this.$colors.onchange = function() {
      eventer.emit('changeColor', that.$colors.value);
    };

    eventer.on('selectColor', function(colorIndex) {
      that.$colors.selectedIndex = colorIndex
      if (that.$colors.selectedIndex < 0) {
        that.$colors.selectedIndex = 0;
      }
      eventer.emit('changeColor', that.$colors.selectedIndex);
    }, this);

    eventer.emit('selectColor', params.ci);
  }
};

class SnapshotsView {
  constructor(paramView) {
    this._paramView = paramView;

    this.$snapshots = document.getElementById('snapshots');
  }

  init() {
    eventer.on('addSnapshot', this.add, this);
  }

  add(data) {
    const that = this;

    //
    // data.imageUrlData: 
    // data.params;
    //
    const params = data.params;

    const sumbnailCanvas = document.createElement('canvas');
    const sumbnailCtx = sumbnailCanvas.getContext('2d');
    sumbnailCanvas.width = 100;
    sumbnailCanvas.height = 100;
    sumbnailCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height,
      0, 0, sumbnailCanvas.width, sumbnailCanvas.height);

    const image = new Image();
    image.src = sumbnailCanvas.toDataURL();
    image.title = "cs: " + params.cs.toString() + "\n"
      + "center: " + params.center + "\n"
      + "zoom: " + params.zoom + "\n"
      + "resolution: " + params.resolution + "\n"
      + "maxRepeat: " + params.maxRepeat + "\n"
      + "skip: " + params.skip;

    const snapshots = this.$snapshots;
    const snapshot = document.createElement('div');

    snapshot.className = "snapshot";
    snapshot.appendChild(image);
    snapshots.appendChild(snapshot);

    image.onload = function() {
      const delBtn = document.createElement('div');
      delBtn.className = "del";
      delBtn.innerText = "x";
      snapshot.appendChild(delBtn);

      delBtn.onclick = function() {
        snapshots.removeChild(snapshot);
      };

      image.onclick = function() {
        that._paramView.csre(params.cs.re);
        that._paramView.csim(params.cs.im);
        that._paramView.centerX(params.center.re);
        that._paramView.centerY(params.center.im);
        that._paramView.zoom(params.zoom);
        that._paramView.resolution(params.resolution);
        that._paramView.maxRepeat(params.maxRepeat);
        that._paramView.skip(params.skip);

        eventer.emit('selectColor', params.colorIndex);
        eventer.emit('refresh');
      };
    }
  }
};
