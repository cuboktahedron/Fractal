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

    eventer.on('changeColor', (data) => {
      this._colorPalette = data.colorPalette;
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
        colorPalette: this._colorPalette,
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
      colorPalette: this._colorPalette,
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
  
  _clear() {
    this._backCtx.fillStyle = this._colorPalette.background;
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
    const colors = this._colorPalette.colors;
    const block = this.$canvas.width / resolution;

    for (let x = 0; x < julia.length; x++) {
      let n = julia[y][x];
      if (n < skip) {
        continue;
      } else if (n == maxRepeat) {
        this._backCtx.fillStyle = this._colorPalette.background2;
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
    params = Object.assign({}, {
      csre: this.$csre.value,
      csim: this.$csim.value,
      centerX: this.$centerX.value,
      centerY: this.$centerY.value,
      zoom: this.$zoom.value,
      resolution: this.$resolution.value,
      maxRepeat: this.$maxRepeat.value,
      skip: this.$skip.value,
    }, params)

    this.csre(params.csre);
    this.csim(params.csim);
    this.centerX(params.ctre);
    this.centerY(params.ctim);
    this.zoom(params.zm);
    this.resolution(params.rs);
    this.maxRepeat(params.rp);
    this.skip(params.sp);

    this.$csre.onchange = () => { this._reset('csre'); eventer.emit('refresh') };
    this.$csim.onchange = () => { this._reset('csim'); eventer.emit('refresh') };
    this.$centerX.onchange = () => { this._reset('centerX'); eventer.emit('refresh') };
    this.$centerY.onchange = () => { this._reset('centerY'); eventer.emit('refresh') };
    this.$zoom.onchange = () => { this._reset('zoom'); eventer.emit('refresh') };
    this.$resolution.onchange = () => { this._reset('resolution'); eventer.emit('refresh') };
    this.$maxRepeat.onchange = () => { this._reset('maxRepeat'); eventer.emit('refresh') };
    this.$skip.onchange = () => { this._reset('skip'); eventer.emit('refresh') };
  }

  _reset(prop) {
    this[prop](this[prop]());
  }

  csre() {
    if (arguments.length === 0) {
      return +this.$csre.value;
    } else {
      let value = Number(arguments[0]);
      if (isNaN(value)) {
        value = 0;
      } else if (value > this.$csre.max) {
        value = this.$csre.max;
      } else if (value < this.$csre.min) {
        value = this.$csre.min;
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
        value = 0;
      } else if (value > this.$csim.max) {
        value = this.$csim.max;
      } else if (value < this.$csim.min) {
        value = this.$csim.min;
      }

      this.$csim.value = value;
    }
  }

  centerX() {
    if (arguments.length === 0) {
      return +this.$centerX.value;
    } else {
      let value = Number(arguments[0]);
      if (isNaN(value)) {
        value = 0;
      } else if (value > this.$centerX.max) {
        value = this.$centerX.max;
      } else if (value < this.$centerX.min) {
        value = this.$centerX.min;
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
        value = 0;
      } else if (value > this.$centerY.max) {
        value = this.$centerY.max;
      } else if (value < this.$centerY.min) {
        value = this.$centerY.min;
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
        value = 100;
      } else if (value > this.$zoom.max) {
        value = this.$zoom.max;
      } else if (value < this.$zoom.min) {
        value = this.$zoom.min;
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
        value = 75;
      } else if (value > this.$resolution.max)  {
        value = this.$resolution.max;
      } else if (value < this.$resolution.min)  {
        value = this.$resolution.min;
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
        value = 500;
      } else if (value > this.$maxRepeat.max)  {
        value = this.$maxRepeat.max;
      } else if (value < 0) {
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
        value = 0;
      } else if (value > this.$skip.max)  {
        value = this.$skip.max;
      } else if (value < this.$skip.min)  {
        value = this.$skip.min;
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
    eventer.on('changeColor', (data) => {
      this._colorPalette = data.colorPalette;
      this._colorIndex = data.colorIndex;
    });

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
    this.$backgroundColor = document.getElementById('background-color');
    this.$finalColor = document.getElementById('final-color');
    this.$ordinalColors = document.getElementById('ordinal-colors');
    this.$customColorset = document.getElementById('custom-colorset');
    this.$colorPicker = document.getElementById('color-picker');
    this.$opDelColor = document.getElementById('op-del-color');

    this._customColorPalettes = [];
    this._colorPalettes = [];
  }

  init(params) {
    this._initColorSelection();

    this.$colors.onchange = () => this.changeColor(this.$colors.value);
    this.$colors.onfocus = () => { this.$colors.dataset.prevIndex = this.$colors.value; }
    this.$opDelColor.onclick = () => this.delColor();

    eventer.on('selectColor', (colorIndex) => this.selectColor(colorIndex));
    eventer.on('selectColorByName', (name) => this.selectColorByName(name));
    eventer.emit('selectColor', params.ci);
  }

  _initColorSelection() {
    this.$colors.innerHTML = '';

    for(let i = 0; i < colorPalettes.length; i++) {
      const option = document.createElement('option');
      option.innerText = colorPalettes[i].name;
      option.value = i;
      option.className = 'preset';
      this.$colors.appendChild(option);
    }

    for(let i = 0; i < this._customColorPalettes.length; i++) {
      const option = document.createElement('option');
      option.innerText = this._customColorPalettes[i].name;
      option.value = colorPalettes.length + i;
      this.$colors.appendChild(option);
    }

    const customOption = document.createElement('option');
    customOption.value = colorPalettes.length + this._customColorPalettes.length;
    customOption.innerText = '<< new >>';
    this.$colors.appendChild(customOption);

    this._colorPalettes = []
      .concat(JSON.parse(JSON.stringify(colorPalettes)))
      .concat(JSON.parse(JSON.stringify(this._customColorPalettes)));
  }

  async changeColor(colorIndex) {
    if (+colorIndex === this._colorPalettes.length) {
      await this.openCustomColorset(colorIndex);
      return;
    }

    this.$colors.dataset.prevIndex = this.$colors.value;
    const palette = this._colorPalettes[colorIndex];
    this.$backgroundColor.style.backgroundColor = palette.background;
    this.$finalColor.style.backgroundColor = palette.background2;

    const cpr = 24;
    this.$ordinalColors.innerHTML = '';
    const colorNum = palette.colors.length;
    const rowMax = colorNum / cpr;
    for (let row = 0; row < rowMax; row++) {
      const colorRow = document.createElement('div');
      colorRow.className = 'ordinal-colors-row';

      for (let no = row * cpr; no < (row + 1) * cpr && no < colorNum; no++) {
        const color = document.createElement('div');
        color.className = 'ordinal-color';
        color.style.backgroundColor = palette.colors[no];
        color.onclick = () => this.openColorPicker(color);

        colorRow.appendChild(color);
      }

      this.$ordinalColors.appendChild(colorRow);
    }

    this.$opDelColor.disabled = palette.preset;

    eventer.emit('changeColor', {
      colorPalette: palette,
      colorIndex: colorIndex
    });
  }

  async openCustomColorset(colorIndex) {
    const ccView = new CustomColorsetView();
    ccView.init();
    await ccView.show();

    if (ccView.isOk()) {
      const newcolorPalette = {
        name: ccView.name(),
        background: '#000',
        background2: '#fff',
        colors: (() => {
          const colors = [];
          for (let i = 0; i < ccView.colorNum(); i++) {
            colors.push('#000');
          }
          return colors;
        })(),
        preset: false,
      };

      this._customColorPalettes.push(newcolorPalette);
      this._initColorSelection();
      eventer.emit('selectColor', colorIndex);
    } else {
      this.$colors.selectedIndex = this.$colors.dataset.prevIndex;
    }
  }

  selectColor(colorIndex) {
    this.$colors.selectedIndex = colorIndex
    if (this.$colors.selectedIndex < 0) {
      this.$colors.selectedIndex = 0;
    }

    this.changeColor(this.$colors.selectedIndex);
  }

  selectColorByName(name) {
    let colorIndex = 0;
    colorIndex = this._colorPalettes.map(c => c.name).indexOf(name);
    if (colorIndex === -1) {
      colorIndex = 0;
    }

    this.selectColor(colorIndex);
  }

  openColorPicker($color) {
    this.$colorPicker.click();
    this.$colorPicker.onchange = () => {
      $color.style.background = this.$colorPicker.value;
    }
  }

  delColor() {
    const customColorIndex = +this.$colors.selectedIndex - colorPalettes.length;
    if (customColorIndex < 0) {
      return;
    }

    this._customColorPalettes.splice(customColorIndex, 1);
    this._initColorSelection();
    eventer.emit('selectColor', customColorIndex + colorPalettes.length - 1);
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

        eventer.emit('selectColorByName', params.colorPalette.name);
        eventer.emit('refresh');
      };
    }
  }
};

class CustomColorsetView {
  constructor() {
    this.$form = document.querySelector('#custom-colorset form');
    this.$customColorset = document.getElementById('custom-colorset');
    this.$ok = document.querySelector('#custom-colorset .ok');
    this.$cancel = document.querySelector('#custom-colorset .cancel');
    this.$colorNum = document.querySelector('#custom-colorset .color-num');
    this.$name = document.querySelector('#custom-colorset .name');
  }

  init() {
    this._isOk = false;
    this._colorNum = 16;
    this._name = '';
    this.$colorNum.value = this._colorNum;
    this.$name.value = this._name;

    this.$form.onsubmit = () => { return false; }
  }

  async show() {
    this.$customColorset.style.display = 'block';
    this.$form.onsubmit = () => { this.ok(); return false; };
    this.$cancel.onclick = () => this.cancel();

    this.$name.focus();

    while (this.isShowing()) {
      await Process.sleep(10);
    }
  }

  hide() {
    this.$customColorset.style.display = 'none';
  }

  isOk() {
    return this._isOk;
  }

  colorNum() {
    return this._colorNum;
  }

  name() {
    return this._name;
  }

  isShowing() {
    return this.$customColorset.style.display !== 'none';
  }

  ok() {
    if (this.$name.value.trim() === '') {
      return;
    }

    this.hide();
    this._isOk = true;
    this._colorNum = this.$colorNum.value;
    this._name = this.$name.value;
  }

  cancel() {
    this.hide();
  }
};
