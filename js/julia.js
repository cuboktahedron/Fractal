var Complex = function(re, im) {
  this.re = re;
  this.im = im;
}

Complex.prototype = {
  add: function(c) {
    return new Complex(this.re + c.re, this.im + c.im);
  },

  mul: function(c) {
    var re = this.re * c.re - this.im * c.im;
    var im = this.re * c.im + this.im * c.re;
    return new Complex(re, im);
  },

  abs: function() {
    return Math.sqrt(this.re * this.re + this.im * this.im);
  },

  abs2: function() {
    return this.re * this.re + this.im * this.im;
  },

  toString: function() {
    if (this.im >= 0) {
      return this.re + " + " + this.im + "i";
    } else {
      return this.re + " - " + -this.im + "i";
    }
  }
}

var Diagnosis = {
  elapsedTime: function(f) {
    var before = new Date();
    f();
    return new Date() - before;
  }
};

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

var paramView = new ParameterView();
var operationView = new OperationView();
var noticeView = new NoticeView();
var snapshotsView = new SnapshotsView();

var canvas;
var ctx;

window.onload = function() {
  var inputs = document.getElementsByTagName("input");
  var i;

  for (i = 0; i < inputs.length; i++) {
    inputs[i].onchange = function() { refresh() };
  }

  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');

  addMouseEvent(canvas);

  refresh();
}

function addMouseEvent(canvas) {
  var downed = -1;
  var prevPoint;

  canvas.oncontextmenu = function() {
    return false;
  }

  canvas.onmousedown = function(ev) {
    var centerX = paramView.centerX();
    var centerY = paramView.centerY();

    downed = ev.button;
    prevPoint = { x: centerX, y: centerY };
  }

  canvas.ondblclick = function(ev) {
    var centerX = paramView.centerX();
    var centerY = paramView.centerY();
    var zoom = paramView.zoom();
    var diffX = ev.layerX - (canvas.clientWidth / 2);
    var diffY = ev.layerY - (canvas.clientHeight / 2);
    var newCenterX = centerX + ((diffX / (canvas.clientWidth / 2)) * (100 / zoom)); 
    var newCenterY = centerY + ((diffY / (canvas.clientHeight / 2)) * (100 / zoom));

    paramView.centerX(newCenterX);
    paramView.centerY(newCenterY);

    refresh();
  }

  canvas.onmousemove = function(ev) {
    if (downed !== 0 && downed !== 2) {
      return;
    }

    var centerX = paramView.centerX();
    var centerY = paramView.centerY();
    var csre = paramView.csre();
    var csim = paramView.csim();
    var zoom = paramView.zoom();
    var newCenterX;
    var newCenterY;
    var newCsre;
    var newCsim;

    if (downed === 0) { // left button
      newCenterX = centerX - ((ev.movementX / (canvas.clientWidth / 2)) * (100 / zoom)); 
      newCenterY = centerY - ((ev.movementY / (canvas.clientHeight / 2)) * (100 / zoom));
      paramView.centerX(newCenterX);
      paramView.centerY(newCenterY);

      refresh(true);
      return;
    }

    if (downed === 2) { // right button
      newCsre = csre + (ev.movementX / (zoom * 10));
      newCsim = csim + (ev.movementY / (zoom * 10));
      paramView.csre(newCsre);
      paramView.csim(newCsim);

      refresh(true);

      return;
    }
  }

  canvas.onmouseup = function(ev) {
    if (downed !== ev.button) {
      return;
    }
  
    downed = -1;

    refresh();
  }

  canvas.onmousewheel = function(ev) {
    var centerX = paramView.centerX();
    var centerY = paramView.centerY();

    var diffX = ev.layerX - (canvas.clientWidth / 2);
    var diffY = ev.layerY - (canvas.clientHeight / 2);

    var px = centerX + ((diffX / (canvas.clientWidth / 2)) * (100 /  paramView.zoom())); 
    var py = centerY + ((diffY / (canvas.clientHeight / 2)) * (100 /  paramView.zoom()));

    if (ev.wheelDelta > 0) {
      paramView.zoomIn();
    } else {
      paramView.zoomOut();
    }

    var newCenterX = px - ((diffX / (canvas.clientWidth / 2)) * (100 / paramView.zoom())); 
    var newCenterY = py - ((diffY / (canvas.clientHeight / 2)) * (100 / paramView.zoom()));
    paramView.centerX(newCenterX);
    paramView.centerY(newCenterY);

    refresh();

    ev.preventDefault();
  }
}

function clear() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function calculation(resolution) {
  var maxRepeat = paramView.maxRepeat();

  var csre = paramView.csre();
  var csim = paramView.csim();
  var cs = new Complex(csre, csim);
  var centerX = paramView.centerX();
  var centerY = paramView.centerY();

  var zoom = paramView.zoom();

  var size = resolution;
  var min = -1.0 * (1.0 / (zoom / 100));
  var max =  1.0 * (1.0 / (zoom / 100));

  var zs = setup(size, min, max, centerX, centerY);
  var output = initOutput(size, maxRepeat);

  var x, y, n;
  var zi;

  for (y = 0; y < size; y++) {
    for (x = 0; x < size; x++) {
      zi = zs[y][x];
      for (n = 0; n < maxRepeat; n++) {
        if (zi.abs2() > 4.0) {
          output[y][x] = n;
          break;
        }

        zi = zi.mul(zi).add(cs);
      }
    }
  }

  return output;
}

function setup(size, min, max, centerX, centerY) {
  var xv = linspace(min + centerX, max + centerX, size);
  var yv = linspace(min + centerY, max + centerY, size);
  var x, y;

  var mat2 = [];
  for (y = 0; y < size; y++) {
    var mat = [];
    for (x = 0; x < size; x++) {
      mat.push(new Complex(xv[x], yv[y]))
    }
    mat2.push(mat);
  }

  return mat2;
}

function linspace(min, max, size) {
  var vec = [];
  var diff = max - min
  var delta = diff / size

  for (i = 0; i < size; i++) {
        vec[i] = min + (i * delta)
  }

  return vec;
}

function initOutput(size, maxRepeat) {
  var output = [];
  var x, y;
  for (y = 0; y < size; y++) {
    output[y] = [];
    for (x = 0; x < size; x++) {
      output[y][x] = maxRepeat;
    }
  }

  return output;
}

function refresh(rough) {
  var elapsedTime = Diagnosis.elapsedTime(function() {
    var resolution = paramView.resolution();
    if (rough && resolution > 100) {
      resolution = 100;
    }

    var julia = calculation(resolution);
    clear();
    draw(julia, resolution);
  });

  noticeView.time(elapsedTime);
}

function colorset() {
  var palette = [
  "#3f32ae",
  "#e30ec2",
  "#baaaff",
  "#ffffff",
  "#ff949d",
  "#e80200",
  "#7a243d",
  "#000000",
  "#195648",
  "#6a8927",
  "#16ed75",
  "#32c1c3",
  "#057fc1",
  "#6e4e23",
  "#c98f4c",
  "#efe305",
  ];

  return palette;
}

function draw(julia, resolution) {
  var maxRepeat = paramView.maxRepeat();
  var skip = paramView.skip();
  var colors = colorset();

  var x, y;
  var n;
  var len = julia.length;
  var block = canvas.width / resolution;

  for (y = 0; y < len; y++) {
    for (x = 0; x < len; x++) {
      n = julia[y][x];
      if (n < skip || n == maxRepeat) {
        ctx.fillStyle = "rgb(0, 0, 0)";
      } else {
        ctx.fillStyle = colors[n % 16];
      }
      ctx.fillRect(x * block, y * block, block, block);
    }
  }
}
