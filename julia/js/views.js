var NoticeView = function() {
  this.$notice = document.getElementById('notice');
}

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
  this.$fullScreen = document.getElementById('op-fullscreen');
  this.$save = document.getElementById('op-save');
  this.$download = document.getElementById('op-download');

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
    };

    snapshotsView.add(data);
  }

  this.$download.onclick = function() {
    var filename = new Date().getTime();
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

var SnapshotsView = function() {
  this.$snapshots = document.getElementById('snapshots');
};

SnapshotsView.prototype = {

  add: function(data) {
    //
    // data.imageUrlData: 
    // data.params;
    //
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
      + "maxRepeat: " + params.maxRepeat;

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

        refresh();
      };
    }
  }
}
