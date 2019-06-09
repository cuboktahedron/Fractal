'use strict';

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
        center: new MutableComplex(this._paramView.centerX(), this._paramView.centerY()),
        zoom: this._paramView.zoom(),
        resolution: this._paramView.resolution(),
        maxRepeat: this._paramView.maxRepeat(),
        skip: this._paramView.skip(),
        power: this._paramView.power(),
        colorPalette: this._colorPalette,
      };

      eventer.emit('addSnapshot', data);
    });

    eventer.on('downloadImage', () => {
      const filename = "ct_" + this._paramView.centerX() + '+' + this._paramView.centerY() + 'i '
        + "zm_" + this._paramView.zoom() + ' '
        + "rs_" + this._paramView.resolution() + ' '
        + "rp_" + this._paramView.maxRepeat() + ' '
        + "sp_" + this._paramView.skip() + ' '
        + "pw_" + this._paramView.power() + ' ';

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
      center: new MutableComplex(this._paramView.centerX(), this._paramView.centerY()),
      zoom: this._paramView.zoom(),
      resolution: resolution,
      maxRepeat: this._paramView.maxRepeat(),
      skip: this._paramView.skip(),
      power: this._paramView.power(),
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
    this.$zoom = document.getElementById('zoom');
    this.$resolution = document.getElementById('resolution');
    this.$maxRepeat = document.getElementById('max-Repeat');
    this.$skip = document.getElementById('skip');
    this.$power = document.getElementById('power');
  }

  init(params) {
    params = Object.assign({}, {
      ctre: this.$centerX.value,
      ctim: this.$centerY.value,
      zm: this.$zoom.value,
      rs: this.$resolution.value,
      rp: this.$maxRepeat.value,
      sp: this.$skip.value,
      pw: this.$power.value,
    }, params)

    this.centerX(params.ctre);
    this.centerY(params.ctim);
    this.zoom(params.zm);
    this.resolution(params.rs);
    this.maxRepeat(params.rp);
    this.skip(params.sp);
    this.power(params.pw);

    this.$centerX.onchange = () => { this._reset('centerX'); eventer.emit('refresh') };
    this.$centerY.onchange = () => { this._reset('centerY'); eventer.emit('refresh') };
    this.$zoom.onchange = () => { this._reset('zoom'); eventer.emit('refresh') };
    this.$resolution.onchange = () => { this._reset('resolution'); eventer.emit('refresh') };
    this.$maxRepeat.onchange = () => { this._reset('maxRepeat'); eventer.emit('refresh') };
    this.$skip.onchange = () => { this._reset('skip'); eventer.emit('refresh') };
    this.$power.onchange = () => { this._reset('power'); eventer.emit('refresh') };
  }

  _reset(prop) {
    this[prop](this[prop]());
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

  power() {
    if (arguments.length === 0) {
      return +this.$power.value;
    } else {
      let value = Number(arguments[0]);
      if (isNaN(value)) {
        value = 0;
      } else if (value > this.$power.max)  {
        value = this.$power.max;
      } else if (value < this.$power.min)  {
        value = this.$power.min;
      }

      this.$power.value = value;
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
    eventer.on('changeColor', (data) => {
      this._colorPalette = data.colorPalette;
      this._colorIndex = data.colorIndex;
    });

    this.$fullScreen.onclick = () => eventer.emit('beCanvasFullScreen');
    this.$save.onclick = () => eventer.emit('saveCanvas');
    this.$download.onclick = () => eventer.emit('downloadImage');

    this.$url.onclick = () => {
      const params = [];
      params.push('ctre=' + this._paramView.centerX());
      params.push('ctim=' + this._paramView.centerY());
      params.push('zm=' + this._paramView.zoom());
      params.push('rs=' + this._paramView.resolution());
      params.push('rp=' + this._paramView.maxRepeat());
      params.push('sp=' + this._paramView.skip());
      params.push('pw=' + this._paramView.power());

      if (this._colorPalette.preset) {
        params.push('ci=' + this._colorIndex);
      } else {
        params.push('cn=' + this._colorPalette.name);
      }

      const url = location.href.replace(/\?.*/, '') + '?' + params.join('&');
      this.$txUrl.value = url;
      this.$txUrl.select();
      document.execCommand('copy')
    }
  }
};

class ColorsetsView {
  constructor() {
    this.$colorsets = document.getElementById('colorsets');
    this.$colors = document.getElementById('sel-colors');
    this.$specialColors = document.getElementById('special-colors');
    this.$ordinalColors = document.getElementById('ordinal-colors');
    this.$customColorset = document.getElementById('custom-colorset');
    this.$colorPicker = document.getElementById('color-picker');
    this.$opDelColor = document.getElementById('op-del-color');
    this.$opEditColor = document.getElementById('op-edit-color');
    this.$colorInfo = document.getElementById('color-info');
    this.$colorType = document.getElementById('color-type');
    this.$colorType = document.getElementById('color-type');
    this.$ctcRgb = document.getElementById('color-type-checks-rgb');
    this.$ctcHsv = document.getElementById('color-type-checks-hsv');
    this.$chkRgbR = document.getElementById('chk-rgb-r');
    this.$chkRgbG = document.getElementById('chk-rgb-g');
    this.$chkRgbB = document.getElementById('chk-rgb-b');
    this.$chkHsvH = document.getElementById('chk-hsv-h');
    this.$chkHsvS = document.getElementById('chk-hsv-s');
    this.$chkHsvV = document.getElementById('chk-hsv-v');
    this._colorPalettes = [];
  }

  init(params) {
    try {
      this._restoreFromLocalStorage();
      this._initColorSelection();
    } catch (e) {
      console.warn('Failed in restoring custom color palettes.');
      localStorage.removeItem('colorPalettes');
      this._initColorSelection();
    }

    this.$colors.onchange = () => this.changeColor(this.$colors.value);
    this.$colors.onfocus = () => { this.$colors.dataset.prevIndex = this.$colors.value; }
    this.$opDelColor.onclick = () => this.delColor();
    this.$opEditColor.onclick = () => this.editColor();
    this.$colorType.onchange = () => this._refreshColorType();

    eventer.on('selectColor', (colorIndex) => this.selectColor(colorIndex));
    eventer.on('selectColorByName', (name) => this.selectColorByName(name));

    if (!!params.cn) {
      eventer.emit('selectColorByName', params.cn);
    } else {
      eventer.emit('selectColor', params.ci);
    }
  }

  _initColorSelection() {
    this.$colors.innerHTML = '';
    for(let i = 0; i < this._colorPalettes.length; i++) {
      let colorPalette = this._colorPalettes[i];
      const option = document.createElement('option');
      option.innerText = colorPalette.name;
      option.value = i;
      option.className = colorPalette.preset ? 'preset' : '';
      this.$colors.appendChild(option);
    }

    const customOption = document.createElement('option');
    customOption.value = this._colorPalettes.length;
    customOption.innerText = '<< new >>';
    this.$colors.appendChild(customOption);
  }

  _restoreFromLocalStorage() {
    const presets = JSON.parse(JSON.stringify(PresetColorPalettes));
    if (typeof window.localStorage === 'undefined') {
      this._colorPalettes = presets;
      return;
    }

    const colorpalettes = localStorage.getItem('colorPalettes');
    if (colorpalettes == null) {
      this._colorPalettes = presets;
      return;
    }

    const customColorPalettes = JSON.parse(colorpalettes).filter(palette => !palette.preset);
    this._colorPalettes = [].concat(presets).concat(customColorPalettes);
  }

  _saveToLocalStore() {
    if (typeof window.localStorage === 'undefined') {
      return;
    }

    const colorPalettes = JSON.stringify(this._colorPalettes);
    localStorage.setItem('colorPalettes', colorPalettes);
  }

  async changeColor(colorIndex) {
    if (+colorIndex === this._colorPalettes.length) {
      await this.openCustomColorset(colorIndex);
      return;
    }

    this.$colors.dataset.prevIndex = this.$colors.value;
    const palette = this._colorPalettes[colorIndex];

    this.$specialColors.innerHTML = '';
    const backgroundColor = document.createElement('div');
    backgroundColor.id = 'background-color';
    backgroundColor.style.backgroundColor = palette.background;
    backgroundColor.dataset.color = palette.background;
    backgroundColor.dataset.no = -1;
    backgroundColor.onmouseover = () => this._showColorInfo(backgroundColor);
    backgroundColor.onmouseleave = () => this._clearColorInfo();
    if (!palette.preset) {
      backgroundColor.onclick = () => this.openColorPicker(backgroundColor, palette);
    }
    this.$specialColors.appendChild(backgroundColor);

    const finalColor = document.createElement('div');
    finalColor.id = 'final-color';
    finalColor.style.backgroundColor = palette.background2;
    finalColor.dataset.color = palette.background2;
    finalColor.dataset.no = -2;
    finalColor.onmouseover = () => this._showColorInfo(finalColor);
    finalColor.onmouseleave = () => this._clearColorInfo();
    if (!palette.preset) {
      finalColor.onclick = () => this.openColorPicker(finalColor, palette);
    }
    this.$specialColors.appendChild(finalColor);

    const cpr = 24;
    this.$ordinalColors.remove();
    this.$ordinalColors = document.createElement('div');
    this.$ordinalColors.id = 'ordinal-colors';
    this.$colorsets.insertBefore(this.$ordinalColors, this.$colorPicker);

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
        color.dataset.color = palette.colors[no];
        color.dataset.no = no;
        color.onmouseover = () => this._showColorInfo(color);
        color.onmouseleave = () => this._clearColorInfo();
        if (!palette.preset) {
          color.onclick = () => this.openColorPicker(color, palette);
        }
        color.ondragstart = (e) => e.preventDefault();
        colorRow.appendChild(color);
      }

      this.$ordinalColors.appendChild(colorRow);
    }

    if (!palette.preset) {
      this._addGradationFunc();
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    if(userAgent.indexOf('edge') !== -1) {
      this.$colorPicker.style.display = palette.preset ? 'none' : 'inline';
    }

    this._refreshColorType();
    this.$opDelColor.disabled = palette.preset;
    this.$opEditColor.disabled = palette.preset;

    eventer.emit('changeColor', {
      colorPalette: palette,
      colorIndex: colorIndex
    });
  }

  _refreshColorType() {
    const palette = this._colorPalettes[this.$colors.selectedIndex];

    this.$ctcRgb.classList.remove('active');
    this.$ctcHsv.classList.remove('active');
    if (!palette.preset) {
      if (this.$colorType.value === 'rgb') {
        this.$ctcRgb.classList.add('active');
      } else {
        this.$ctcHsv.classList.add('active');
      }
    }
  }
  
  _showColorInfo(color) {
    const pattern = this.$colorType.value;
    const rgb = new Rgb(color.dataset.color);
    if (pattern === 'rgb') {
      this.$colorInfo.innerText = 'R:' + rgb.r + ' G:' + rgb.g + ' B:' + rgb.b;
    } else {
      const hsv = Hsv.createFromRgb(rgb);
      this.$colorInfo.innerText = 'H:' +hsv.h + '° S:' + hsv.s + '% V:' + hsv.v + '%';
    }
  }

  _clearColorInfo() {
    this.$colorInfo.innerText = '';
  }

  _addGradationFunc() {
    const $colors = this.$ordinalColors.querySelectorAll('.ordinal-color');
    let $beginColor = null;

    this.$ordinalColors.onmouseleave = () => {
      if ($beginColor == null) {
        return;
      }

      $colors.forEach(color => color.classList.remove('select'));
    }

    this.$ordinalColors.onmousedown = (e) => {
      $beginColor = e.target;
      $beginColor.classList.add('select');
    }

    this.$ordinalColors.onmouseleave = (e) => {
      if ($beginColor == null) {
        return;
      }

      $colors.forEach($col => $col.classList.remove('select'));
      $beginColor = null;
    }

    $colors.forEach(($color) => {
      $color.onmouseenter = (e) => { 
        if ($beginColor == null) {
          return;
        }

        let begin = +$beginColor.dataset.no;
        let end = +e.target.dataset.no;
        if (begin > end) {
          [begin, end] = [end, begin];
        }

        $colors.forEach($col => {
          $col.classList.remove('select');
          if (begin <= $col.dataset.no && $col.dataset.no <= end) {
            $col.classList.add('select');
          }
        });
      };

      $color.onmouseup = (e) => {
        if ($beginColor == null) {
          return;
        } 

        let begin = +$beginColor.dataset.no;
        let end = +e.target.dataset.no;
        if (begin > end) {
          [begin, end] = [end, begin];
        }

        $colors.forEach($col => {
          $col.classList.remove('select');
        });

        const palette = this._colorPalettes[this.$colors.selectedIndex];
        if (this.$colorType.value === 'rgb') {
          const beginRgb = new Rgb($colors[begin].dataset.color);
          const endRgb = new Rgb($colors[end].dataset.color);
          const diffR = this.$chkRgbR.checked ? 0 : endRgb.r - beginRgb.r;
          const diffG = this.$chkRgbG.checked ? 0 : endRgb.g - beginRgb.g;
          const diffB = this.$chkRgbB.checked ? 0 : endRgb.b - beginRgb.b;

          const diff = end - begin;
          for (let i = 1; i <= diff; i++) {
            const r = beginRgb.r + Math.round((diffR / diff) * i);
            const g = beginRgb.g + Math.round((diffG / diff) * i);
            const b = beginRgb.b + Math.round((diffB / diff) * i);
            const newRgb = new Rgb(r, g, b);
            const $color = $colors[i + begin];
            $color.dataset.color = newRgb.colorCode;
            $color.style.backgroundColor = newRgb.colorCode;
            palette.colors[i + begin] = newRgb.colorCode;
          }
        } else if (this.$colorType.value === 'hsv') {
          const beginHsv = Hsv.createFromRgb(new Rgb($colors[begin].dataset.color));
          const endHsv = Hsv.createFromRgb(new Rgb($colors[end].dataset.color));
          const diffH = this.$chkHsvH.checked ? 0 : endHsv.h - beginHsv.h;
          const diffS = this.$chkHsvS.checked ? 0 : endHsv.s - beginHsv.s;
          const diffV = this.$chkHsvV.checked ? 0 : endHsv.v - beginHsv.v;

          const diff = end - begin;
          for (let i = 1; i <= diff; i++) {
            const h = beginHsv.h + Math.round((diffH / diff) * i);
            const s = beginHsv.s + Math.round((diffS / diff) * i);
            const v = beginHsv.v + Math.round((diffV / diff) * i);
            const newRgb = new Hsv(h, s, v).rgb;
            const $color = $colors[i + begin];
            $color.dataset.color = newRgb.colorCode;
            $color.style.backgroundColor = newRgb.colorCode;
            palette.colors[i + begin] = newRgb.colorCode;
          }
        }

        $beginColor = null;

        this._saveToLocalStore();
        eventer.emit('refresh');
      };
    });
  }

  async openCustomColorset(colorIndex) {
    const ccView = new CustomColorsetView();
    ccView.init();

    const colorNames = this._colorPalettes.map(c => c.name);
    await ccView.show(colorNames);

    if (ccView.isOk()) {
      const newcolorPalette = {
        name: ccView.name(),
        background: '#000000',
        background2: '#ffffff',
        colors: (() => {
          const colors = [];
          for (let i = 0; i < ccView.colorNum(); i++) {
            colors.push('#000000');
          }
          return colors;
        })(),
        preset: false,
      };

      this._colorPalettes.push(newcolorPalette);
      this._initColorSelection();
      this._saveToLocalStore();
      eventer.emit('selectColor', colorIndex);
    } else {
      this.$colors.selectedIndex = this.$colors.dataset.prevIndex;
    }
  }

  async openCustomColorsetForEdit(palette) {
    const ccView = new CustomColorsetView();
    ccView.init(palette);

    const colorNames = this._colorPalettes
      .map(c => c.name)
      .filter(name => name !== palette.name);
    await ccView.show(colorNames);

    if (ccView.isOk()) {
      palette.name = ccView.name();
      const beforeColorNum = palette.colors.length;
      if (beforeColorNum > ccView.colorNum()) {
        palette.colors.splice(ccView.colorNum());
      } else {
        for (let i = beforeColorNum; i < ccView.colorNum(); i++) {
          palette.colors.push('#000000');
        }
      };

      const colorIndex = +this.$colors.selectedIndex
      this._initColorSelection();
      this._saveToLocalStore();
      eventer.emit('selectColor', colorIndex);
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

  openColorPicker($color, palette) {
    this.$colorPicker.value = $color.dataset.color;
    this.$colorPicker.focus();
    this.$colorPicker.click();
    this.$colorPicker.onchange = () => {
      $color.style.background = this.$colorPicker.value;
      if ($color.dataset.no === '-1') {
        palette.background = this.$colorPicker.value;
      } else if ($color.dataset.no === '-2') {
        palette.background2 = this.$colorPicker.value;
      } else {
        palette.colors[$color.dataset.no] = this.$colorPicker.value;
      }

      $color.dataset.color = this.$colorPicker.value;
      this._saveToLocalStore();
      eventer.emit('refresh');
    }
  }

  delColor() {
    const colorIndex = +this.$colors.selectedIndex;
    if (colorIndex < 0) {
      return;
    }

    this._colorPalettes.splice(colorIndex, 1);
    this._saveToLocalStore();
    this._initColorSelection();
    eventer.emit('selectColor', colorIndex - 1);
  }

  async editColor() {
    const colorIndex = +this.$colors.selectedIndex;
    if (colorIndex < 0) {
      return;
    }

    const palette = this._colorPalettes[colorIndex];
    await this.openCustomColorsetForEdit(palette);
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
    image.title = "center: " + params.center + "\n"
      + "zoom: " + params.zoom + "\n"
      + "resolution: " + params.resolution + "\n"
      + "maxRepeat: " + params.maxRepeat + "\n"
      + "skip: " + params.skip + "\n"
      + "power: " + params.power;

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
        this._paramView.centerX(params.center.re);
        this._paramView.centerY(params.center.im);
        this._paramView.zoom(params.zoom);
        this._paramView.resolution(params.resolution);
        this._paramView.maxRepeat(params.maxRepeat);
        this._paramView.skip(params.skip);
        this._paramView.power(params.power);

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

  init(palette) {
    if (palette == null) {
      this.$colorNum.value = 16;
      this.$name.value = '';
    } else {
      this.$colorNum.value = palette.colors.length;
      this.$name.value = palette.name
    }
    this._isOk = false;

    this.$form.oninput = () => { this._validateAll(); return true; }
    this.$form.onsubmit = () => false;
  }

  _validateAll() {
    return this._validateName();
  }

  _validateName() {
    if (this.$name.value.trim() === '') {
      this.$name.setCustomValidity('Required.');
      return false;
    }

    if (!this.$name.value.trim().match(/^[a-zA-Z0-9_\-()]+$/)) {
      this.$name.setCustomValidity('Contains invalid character.');
      return false;
    }

    if (this._colorNames.indexOf(this.$name.value.trim()) !== -1) {
      this.$name.setCustomValidity('This name is already used.');
      return false;
    }

    this.$name.setCustomValidity('');
    return true;
  }

  async show(colorNames) {
    this.$customColorset.style.display = 'block';
    this.$form.onsubmit = () => { this.ok(); return false; };
    this.$cancel.onclick = () => this.cancel();
    this._colorNames = colorNames;

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
    if (!this._validateAll()) {
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
