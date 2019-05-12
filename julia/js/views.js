'use strict';

class CanvasView {
  constructor() {
    const that = this;
    this.$canvas = document.getElementById('canvas');
    this._ctx = this.$canvas.getContext('2d');
    this._paramView = paramView;

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
  
      eventer.emit('refresh');
  
      ev.preventDefault();
    }
  }

  _refresh(rough) {
    const that = this;
    const elapsedTime = Diagnosis.elapsedTime(function() {
      let resolution = that._paramView.resolution();
      if (rough && resolution > 100) {
        resolution = 100;
      }
  
      const julia = calculation(resolution);
      that._clear();
      that._draw(julia, resolution);
    });
  
    noticeView.time(elapsedTime);
  }
  
  _colorset() {
    return colorPalettes[this._colorIndex].colors;
  }
  
  _clear() {
    this._ctx.fillStyle = colorPalettes[this._colorIndex].background;
    this._ctx.fillRect(0, 0, this.$canvas.width, this.$canvas.height);
  }

  _draw(julia, resolution) {
    const maxRepeat = this._paramView.maxRepeat();
    const skip = this._paramView.skip();
    const colors = this._colorset();
    const len = julia.length;
    const block = this.$canvas.width / resolution;
  
    for (let y = 0; y < len; y++) {
      for (let x = 0; x < len; x++) {
        let n = julia[y][x];
        if (n < skip) {
          continue;
        } else if (n == maxRepeat) {
          this._ctx.fillStyle = colorPalettes[this._colorIndex].background2;
        } else {
          this._ctx.fillStyle = colors[n % colors.length];
        }
        this._ctx.fillRect(x * block, y * block, block, block);
      }
    }
  }
};

class NoticeView {
  constructor() {
    this.$notice = document.getElementById('notice');
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
  constructor() {
    const that = this;

    this.$fullScreen = document.getElementById('op-fullscreen');
    this.$save = document.getElementById('op-save');
    this.$download = document.getElementById('op-download');

    eventer.on('changeColor', function(colorIndex) { this._colorIndex = colorIndex; }, this);

    const inputs = document.getElementsByTagName("input");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].onchange = function() { eventer.emit('refresh') };
    }

    this.$fullScreen.onclick = function() {
      canvas.requestFullscreen();
    }

    this.$save.onclick = function() {
      const data = {};

      data.imageUrlData = canvas.toDataURL();
      data.params = {
        cs: new Complex(paramView.csre(), paramView.csim()),
        center: new Complex(paramView.centerX(), paramView.centerY()),
        zoom: paramView.zoom(),
        resolution: paramView.resolution(),
        maxRepeat: paramView.maxRepeat(),
        skip: paramView.skip(),
        colorIndex: that._colorIndex,
      };

      snapshotsView.add(data);
    }

    this.$download.onclick = function() {
      const filename = "cs_" + paramView.csre() + '+' + paramView.csim() + 'i '
        + "ct_" + paramView.centerX() + '+' + paramView.centerY() + 'i '
        + "zm_" + paramView.zoom() + ' '
        + "rs_" + paramView.resolution() + ' '
        + "rp_" + paramView.maxRepeat() + ' '
        + "sp_" + paramView.skip() + ' ';

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
  }
};

class ColorsetsView {
  constructor() {
    this.$colorsets = document.getElementById('colorsets');
    this.$colors = document.getElementById('sel-colors');
  }

  init() {
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

    eventer.emit('changeColor', 0)
    eventer.on('selectColor', function(colorIndex) {
      that.$colors.selectedIndex = colorIndex
      eventer.emit('changeColor', that.$colors.selectedIndex);
    }, this);
  }
};

class SnapshotsView {
  constructor() {
    this.$snapshots = document.getElementById('snapshots');
  }

  add(data) {
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
        paramView.csre(params.cs.re);
        paramView.csim(params.cs.im);
        paramView.centerX(params.center.re);
        paramView.centerY(params.center.im);
        paramView.zoom(params.zoom);
        paramView.resolution(params.resolution);
        paramView.maxRepeat(params.maxRepeat);
        paramView.skip(params.skip);

        eventer.emit('selectColor', params.colorIndex);
        eventer.emit('refresh');
      };
    }
  }
};
