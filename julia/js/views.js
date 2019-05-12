'use strict';

var CanvasView = function(paramView) {
  var that = this;
  this.$canvas = document.getElementById('canvas');
  this._ctx = this.$canvas.getContext('2d');
  this._paramView = paramView;

  this._addMouseEvent();

  eventer.on('changeColor', function(colorIndex) {
    that._colorIndex = colorIndex;
    eventer.emit('refresh');
  }, this);

  eventer.on('refresh', this._refresh, this);
};

CanvasView.prototype = {
  _addMouseEvent: function() {
    var that = this;
    var downed = -1;
  
    this.$canvas.oncontextmenu = function() {
      return false;
    }
  
    this.$canvas.onmousedown = function(ev) {
      var centerX = that._paramView.centerX();
      var centerY = that._paramView.centerY();
  
      downed = ev.button;
    }
  
    this.$canvas.ondblclick = function(ev) {
      var centerX = that._paramView.centerX();
      var centerY = that._paramView.centerY();
      var zoom = that._paramView.zoom();
      var diffX = ev.layerX - (that.$canvas.clientWidth / 2);
      var diffY = ev.layerY - (that.$canvas.clientHeight / 2);
      var newCenterX = centerX + ((diffX / (that.$canvas.clientWidth / 2)) * (100 / zoom)); 
      var newCenterY = centerY + ((diffY / (that.$canvas.clientHeight / 2)) * (100 / zoom));
  
      that._paramView.centerX(newCenterX);
      that._paramView.centerY(newCenterY);
  
      eventer.emit('refresh');
    }
  
    this.$canvas.onmousemove = function(ev) {
      if (downed !== 0 && downed !== 2) {
        return;
      }
  
      var centerX = that._paramView.centerX();
      var centerY = that._paramView.centerY();
      var csre = that._paramView.csre();
      var csim = that._paramView.csim();
      var zoom = that._paramView.zoom();
      var newCenterX;
      var newCenterY;
      var newCsre;
      var newCsim;
  
      if (downed === 0) { // left button
        newCenterX = centerX - ((ev.movementX / (that.$canvas.clientWidth / 2)) * (100 / zoom)); 
        newCenterY = centerY - ((ev.movementY / (that.$canvas.clientHeight / 2)) * (100 / zoom));
        that._paramView.centerX(newCenterX);
        that._paramView.centerY(newCenterY);
  
        eventer.emit('refresh', true);
        return;
      }
  
      if (downed === 2) { // right button
        newCsre = csre + (ev.movementX / (zoom * 10));
        newCsim = csim + (ev.movementY / (zoom * 10));
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
      var centerX = that._paramView.centerX();
      var centerY = that._paramView.centerY();
  
      var diffX = ev.layerX - (that.$canvas.clientWidth / 2);
      var diffY = ev.layerY - (that.$canvas.clientHeight / 2);
  
      var px = centerX + ((diffX / (that.$canvas.clientWidth / 2)) * (100 /  that._paramView.zoom())); 
      var py = centerY + ((diffY / (that.$canvas.clientHeight / 2)) * (100 /  that._paramView.zoom()));
  
      if (ev.wheelDelta > 0) {
        that._paramView.zoomIn();
      } else {
        that._paramView.zoomOut();
      }
  
      var newCenterX = px - ((diffX / (that.$canvas.clientWidth / 2)) * (100 / that._paramView.zoom())); 
      var newCenterY = py - ((diffY / (that.$canvas.clientHeight / 2)) * (100 / that._paramView.zoom()));
      that._paramView.centerX(newCenterX);
      that._paramView.centerY(newCenterY);
  
      eventer.emit('refresh');
  
      ev.preventDefault();
    }
  },

  _refresh: function(rough) {
    var that = this;
    var elapsedTime = Diagnosis.elapsedTime(function() {
      var resolution = that._paramView.resolution();
      if (rough && resolution > 100) {
        resolution = 100;
      }
  
      var julia = calculation(resolution);
      that._clear();
      that._draw(julia, resolution);
    });
  
    noticeView.time(elapsedTime);
  },
  
  _colorset: function() {
    return colorPalettes[this._colorIndex].colors;
  },
  
  _clear: function() {
    this._ctx.fillStyle = colorPalettes[this._colorIndex].background;
    this._ctx.fillRect(0, 0, this.$canvas.width, this.$canvas.height);
  },

  _draw: function(julia, resolution) {
    var maxRepeat = this._paramView.maxRepeat();
    var skip = this._paramView.skip();
    var colors = this._colorset();
  
    var x, y;
    var n;
    var len = julia.length;
    var block = this.$canvas.width / resolution;
  
    for (y = 0; y < len; y++) {
      for (x = 0; x < len; x++) {
        n = julia[y][x];
        if (n < skip || n == maxRepeat) {
          continue;
        } else {
          this._ctx.fillStyle = colors[n % colors.length];
        }
        this._ctx.fillRect(x * block, y * block, block, block);
      }
    }
  }
};

var NoticeView = function() {
  this.$notice = document.getElementById('notice');
};

NoticeView.prototype = {
  time: function() {
    var value;
    var sec

    if (arguments.length === 0) {
      return 
    } else {
      value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      }

      sec = value / 1000.0;
      this.$notice.innerText = 'processing time: ' + sec + 'sec';
    }
  }
};

var ParameterView = function() {
  this.$centerX = document.getElementById('center-x');
  this.$centerY = document.getElementById('center-y');
  this.$csre = document.getElementById('cs-re');
  this.$csim = document.getElementById('cs-im');
  this.$zoom = document.getElementById('zoom');
  this.$resolution = document.getElementById('resolution');
  this.$maxRepeat = document.getElementById('max-Repeat');
  this.$skip = document.getElementById('skip');
};

ParameterView.prototype = {
  centerX: function() {
    var value;

    if (arguments.length === 0) {
      return +this.$centerX.value;
    } else {
      value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      }

      this.$centerX.value = value;
    }
  },

  centerY: function() {
    var value;

    if (arguments.length === 0) {
      return +this.$centerY.value;
    } else {
      value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      }

      this.$centerY.value = value;
    }
  },

  csre: function() {
    var value;

    if (arguments.length === 0) {
      return +this.$csre.value;
    } else {
      value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      }

      this.$csre.value = value;
    }
  },

  csim: function() {
    var value;

    if (arguments.length === 0) {
      return +this.$csim.value;
    } else {
      value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      }

      this.$csim.value = value;
    }
  },

  centerY: function() {
    var value;

    if (arguments.length === 0) {
      return +this.$centerY.value;
    } else {
      value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      }

      this.$centerY.value = value;
    }
  },

  zoom: function() {
    var value;

    if (arguments.length === 0) {
      return +this.$zoom.value;
    } else {
      value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      } else if (value <= 0) {
        value = 1;
      }

      this.$zoom.value = value;
    }
  },

  resolution: function() {
    var value;

    if (arguments.length === 0) {
      return +this.$resolution.value;
    } else {
      value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      } else if (value >= 2400) {
        value = 2400;
      } else if (value <= 0) {
        value = 1;
      }

      this.$resolution.value = value;
    }
  },

  maxRepeat: function() {
    var value;

    if (arguments.length === 0) {
      return +this.$maxRepeat.value;
    } else {
      value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      } else if (value >= 10000) {
        value = 10000;
      } else if (value <= 0) {
        value = 1;
      }

      this.$maxRepeat.value = value;
    }
  },

  skip: function() {
    var value;

    if (arguments.length === 0) {
      return +this.$skip.value;
    } else {
      value = Number(arguments[0]);
      if (isNaN(value)) {
        return;
      } else if (value < 0) {
        value = 0;
      }

      this.$skip.value = value;
    }
  },

  zoomIn: function() {
    var zoom = this.zoom();
    var value = Math.floor(zoom * Math.sqrt(2))
    if (value === zoom) {
      value++;
    }

    this.zoom(value);
  }, 

  zoomOut: function() {
    var zoom = this.zoom();
    var value = Math.floor(zoom / Math.sqrt(2))
    if (value === zoom) {
      value--;
    }

    this.zoom(value);
  }
};

var OperationView = function() {
  var that = this;

  this.$fullScreen = document.getElementById('op-fullscreen');
  this.$save = document.getElementById('op-save');
  this.$download = document.getElementById('op-download');

  var inputs = document.getElementsByTagName("input");
  var i;

  eventer.on('changeColor', function(colorIndex) { this._colorIndex = colorIndex; }, this);

  for (i = 0; i < inputs.length; i++) {
    inputs[i].onchange = function() { eventer.emit('refresh') };
  }

  this.$fullScreen.onclick = function() {
    canvas.requestFullscreen();
  }

  this.$save.onclick = function() {
    var data = {};

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
    var filename = "cs_" + paramView.csre() + '+' + paramView.csim() + 'i '
      + "ct_" + paramView.centerX() + '+' + paramView.centerY() + 'i '
      + "zm_" + paramView.zoom() + ' '
      + "rs_" + paramView.resolution() + ' '
      + "rp_" + paramView.maxRepeat() + ' '
      + "sp_" + paramView.skip() + ' ';

      var a = document.createElement('a');

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
};

var ColorsetsView = function() {
  this.$colorsets = document.getElementById('colorsets');
  this.$colors = document.getElementById('sel-colors');
};

ColorsetsView.prototype = {
  init: function() {
    var that = this;
    var i;
    var option;
    for(i = 0; i < colorPalettes.length; i++) {
      option = document.createElement('option');
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
  },
};

var SnapshotsView = function() {
  this.$snapshots = document.getElementById('snapshots');
};

SnapshotsView.prototype = {

  add: function(data) {
    //
    // data.imageUrlData: 
    // data.params;
    //
    var that = this;
    var params = data.params;

    var snapshots = this.$snapshots;
    var snapshot = document.createElement('div');
    var sumbnailCanvas = document.createElement('canvas');
    var sumbnailCtx = sumbnailCanvas.getContext('2d');
    var image = new Image();

    sumbnailCanvas.width = 100;
    sumbnailCanvas.height = 100;
    sumbnailCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height,
      0, 0, sumbnailCanvas.width, sumbnailCanvas.height);
    image.src = sumbnailCanvas.toDataURL();

    image.title = "cs: " + params.cs.toString() + "\n"
      + "center: " + params.center + "\n"
      + "zoom: " + params.zoom + "\n"
      + "resolution: " + params.resolution + "\n"
      + "maxRepeat: " + params.maxRepeat + "\n"
      + "skip: " + params.skip;

    snapshot.className = "snapshot";
    snapshot.appendChild(image);
    snapshots.appendChild(snapshot);

    image.onload = function() {
      var delBtn = document.createElement('div');
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
}
