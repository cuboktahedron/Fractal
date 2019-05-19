-'use strict';

class MainView {
  constructor(urlParams) {
    const paramView = new ParameterView();
    paramView.init(urlParams);

    const operationView = new OperationView(paramView);
    operationView.init();

    const canvasView = new CanvasView(paramView, operationView);
    canvasView.init();

    const snapshotsView = new SnapshotsView(paramView);
    snapshotsView.init();

    const noticeView = new NoticeView();
    noticeView.init();

    const colorsetsView = new ColorsetsView();
    colorsetsView.init(urlParams);
  }
}

class CanvasView {
  constructor(paramView, operationView) {
    this._paramView = paramView;
    this._operationView = operationView;

    this.$canvas = document.getElementById('canvas');
    this._ctx = this.$canvas.getContext('2d');
    this.$backCanvas = document.createElement('canvas');
    this.$backCanvas.width = this.$canvas.width;
    this.$backCanvas.height = this.$canvas.height;
    this.$downloadAnchor = document.getElementById('download-anchor');
    this._backCtx = this.$backCanvas.getContext('2d');
    this._refreshCanceling = false;
    this._refreshing = false;
  }

  init() {
    setInterval(() => {
      this._refreshLoop();
    }, 100);

    this._addMouseEvent();

    eventer.on('changeColor', (colorIndex) => {
      this._colorIndex = colorIndex;
      eventer.emit('refresh');
    });

    eventer.on('refresh', (rough) => this._refresh(rough));
    eventer.on('beCanvasFullScreen', () => {
      if (this.$canvas.requestFullscreen) {
        this.$canvas.requestFullscreen();
      } else if (this.$canvas.webkitRequestFullscreen) {
        this.$canvas.webkitRequestFullscreen();
      } else if (this.$canvas.mozRequestFullScreen) {
        this.$canvas.mozRequestFullScreen();
      } else {
        alert('not supported');
      }
    });

    eventer.on('saveCanvas', () => {
      const data = {};

      data.$canvas = this.$canvas;
      data.params = {
        cs: new Complex(this._paramView.csre(), this._paramView.csim()),
        center: new Complex(this._paramView.centerX(), this._paramView.centerY()),
        zoom: this._paramView.zoom(),
        resolution: this._paramView.resolution(),
        maxRepeat: this._paramView.maxRepeat(),
        skip: this._paramView.skip(),
        colorIndex: this._colorIndex,
      };

      eventer.emit('addSnapshot', data);
    });

    eventer.on('downloadImage', () => {
      const filename = "cs_" + this._paramView.csre() + '+' + this._paramView.csim() + 'i '
        + "ct_" + this._paramView.centerX() + '+' + this._paramView.centerY() + 'i '
        + "zm_" + this._paramView.zoom() + ' '
        + "rs_" + this._paramView.resolution() + ' '
        + "rp_" + this._paramView.maxRepeat() + ' '
        + "sp_" + this._paramView.skip() + ' ';

      if (this.$canvas.toBlob) {
        this.$canvas.toBlob((blob) => {
          this.$downloadAnchor.href = URL.createObjectURL(blob);
          this.$downloadAnchor.style="display:none;"
          this.$downloadAnchor.download = filename + '.png';
          this.$downloadAnchor.click();
        });
      } else if (this.$canvas.msToBlob) {
        this.$downloadAnchor.href = URL.createObjectURL(this.$canvas.msToBlob());
        this.$downloadAnchor.download = filename + '.png';;
        this.$downloadAnchor.click();
      } else {
        this.$downloadAnchor.href = this.$canvas.toDataURL('image/png');
        this.$downloadAnchor.download = filename;
        this.$downloadAnchor.click();
      }
    });
  }

  _addMouseEvent() {
    let downed = -1;
  
    this.$canvas.oncontextmenu = () => {
      return false;
    }
  
    this.$canvas.onmousedown = (ev) => {
      downed = ev.button;
    }
  
    this.$canvas.ondblclick = (ev) => {
      const centerX = this._paramView.centerX();
      const centerY = this._paramView.centerY();
      const zoom = this._paramView.zoom();
      const diffX = ev.layerX - (this.$canvas.clientWidth / 2);
      const diffY = ev.layerY - (this.$canvas.clientHeight / 2);
      const newCenterX = centerX + ((diffX / (this.$canvas.clientWidth / 2)) * (100 / zoom));
      const newCenterY = centerY + ((diffY / (this.$canvas.clientHeight / 2)) * (100 / zoom));
  
      this._paramView.centerX(newCenterX);
      this._paramView.centerY(newCenterY);
  
      eventer.emit('refresh');
    }
  
    this.$canvas.onmousemove = (ev) => {
      if (downed !== 0 && downed !== 2) {
        return;
      }

      if (downed === 0 && (ev.shiftKey || this._operationView.shifted())) {
        downed = 2;
      }

      const zoom = this._paramView.zoom();

      if (downed === 0) { // left button
        const centerX = this._paramView.centerX();
        const centerY = this._paramView.centerY();
        const newCenterX = centerX - ((ev.movementX / (this.$canvas.clientWidth / 2)) * (100 / zoom)); 
        const newCenterY = centerY - ((ev.movementY / (this.$canvas.clientHeight / 2)) * (100 / zoom));
        this._paramView.centerX(newCenterX);
        this._paramView.centerY(newCenterY);
  
        eventer.emit('refresh', true);
        return;
      }
  
      if (downed === 2) { // right button
        const csre = this._paramView.csre();
        const csim = this._paramView.csim();
        const newCsre = csre + (ev.movementX / (zoom * 10));
        const newCsim = csim + (ev.movementY / (zoom * 10));
        this._paramView.csre(newCsre);
        this._paramView.csim(newCsim);
  
        eventer.emit('refresh', true);
  
        return;
      }
    }
  
    this.$canvas.onmouseup = (ev) => {
      if (downed === -1) {
        return;
      }
    
      downed = -1;
      eventer.emit('refresh');
    }
  
    this.$canvas.onwheel = (ev) => {
      const centerX = this._paramView.centerX();
      const centerY = this._paramView.centerY();
      const diffX = ev.layerX - (this.$canvas.clientWidth / 2);
      const diffY = ev.layerY - (this.$canvas.clientHeight / 2);
      const px = centerX + ((diffX / (this.$canvas.clientWidth / 2)) * (100 /  this._paramView.zoom())); 
      const py = centerY + ((diffY / (this.$canvas.clientHeight / 2)) * (100 /  this._paramView.zoom()));
  
      const direction = (ev.deltaY < 0 || ev.wheelDelta > 0) ? 1 : -1;
      if (direction > 0) {
        this._paramView.zoomIn();
      } else {
        this._paramView.zoomOut();
      }
  
      const newCenterX = px - ((diffX / (this.$canvas.clientWidth / 2)) * (100 / this._paramView.zoom())); 
      const newCenterY = py - ((diffY / (this.$canvas.clientHeight / 2)) * (100 / this._paramView.zoom()));
      this._paramView.centerX(newCenterX);
      this._paramView.centerY(newCenterY);
  
      eventer.emit('refresh', true);
      setTimeout(() => {
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
    const elapsedTime = await Diagnosis.elapsedTime(async () => {
      const julia = await this._calculation(params);
      if (this._refreshCanceling) {
        return;
      }
      await this._draw(julia, params.resolution);
    });

    if (this._refreshCanceling) {
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
    worker.onmessage = (e) => {
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
    eventer.on('changeNotice', (notice) => this.changeNotice(notice));
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

    this.$csre.onchange = () => { eventer.emit('refresh') };
    this.$csim.onchange = () => { eventer.emit('refresh') };
    this.$centerX.onchange = () => { eventer.emit('refresh') };
    this.$centerY.onchange = () => { eventer.emit('refresh') };
    this.$zoom.onchange = () => { eventer.emit('refresh') };
    this.$resolution.onchange = () => { eventer.emit('refresh') };
    this.$maxRepeat.onchange = () => { eventer.emit('refresh') };
    this.$skip.onchange = () => { eventer.emit('refresh') };
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
    this.$chkShift = document.getElementById('chk-shift');
  }

  init() {
    eventer.on('changeColor', (colorIndex) => this._colorIndex = colorIndex);

    this.$fullScreen.onclick = () => eventer.emit('beCanvasFullScreen');
    this.$save.onclick = () => eventer.emit('saveCanvas');
    this.$download.onclick = () => eventer.emit('downloadImage');

    this.$url.onclick = () => {
      const params = [];
      params.push('csre=' + this._paramView.csre());
      params.push('csim=' + this._paramView.csim());
      params.push('ctre=' + this._paramView.centerX());
      params.push('ctim=' + this._paramView.centerY());
      params.push('zm=' + this._paramView.zoom());
      params.push('rs=' + this._paramView.resolution());
      params.push('rp=' + this._paramView.maxRepeat());
      params.push('sp=' + this._paramView.skip());
      params.push('ci=' + this._colorIndex);

      const url = location.href.replace(/\?.*/, '') + '?' + params.join('&');
      this.$txUrl.value = url;
      this.$txUrl.select();
      document.execCommand('copy')
    }
  }

  shifted() {
    return this.$chkShift.checked;
  }
};

class ColorsetsView {
  constructor() {
    this.$colorsets = document.getElementById('colorsets');
    this.$colors = document.getElementById('sel-colors');
  }

  init(params) {
    for(let i = 0; i < colorPalettes.length; i++) {
      const option = document.createElement('option');
      option.innerText = colorPalettes[i].name;
      option.value = i;
      this.$colors.appendChild(option);
    }

    this.$colors.onchange = () => {
      eventer.emit('changeColor', this.$colors.value);
    };

    eventer.on('selectColor', (colorIndex) => {
      this.$colors.selectedIndex = colorIndex
      if (this.$colors.selectedIndex < 0) {
        this.$colors.selectedIndex = 0;
      }
      eventer.emit('changeColor', this.$colors.selectedIndex);
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
    eventer.on('addSnapshot', (data) => this.add(data));
  }

  add(data) {
    //
    // data.$canvas
    // data.params
    //
    const params = data.params;

    const sumbnailCanvas = document.createElement('canvas');
    const sumbnailCtx = sumbnailCanvas.getContext('2d');
    sumbnailCanvas.width = 100;
    sumbnailCanvas.height = 100;
    sumbnailCtx.drawImage(data.$canvas, 0, 0, data.$canvas.width, data.$canvas.height,
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

    image.onload = () => {
      const delBtn = document.createElement('div');
      delBtn.className = "del";
      delBtn.innerText = "x";
      snapshot.appendChild(delBtn);

      delBtn.onclick = () => {
        snapshots.removeChild(snapshot);
      };

      image.onclick = () => {
        this._paramView.csre(params.cs.re);
        this._paramView.csim(params.cs.im);
        this._paramView.centerX(params.center.re);
        this._paramView.centerY(params.center.im);
        this._paramView.zoom(params.zoom);
        this._paramView.resolution(params.resolution);
        this._paramView.maxRepeat(params.maxRepeat);
        this._paramView.skip(params.skip);

        eventer.emit('selectColor', params.colorIndex);
        eventer.emit('refresh');
      };
    }
  }
};
