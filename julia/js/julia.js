var paramView = new ParameterView();
var canvasView = new CanvasView(paramView);
var operationView = new OperationView();
var snapshotsView = new SnapshotsView();
var noticeView = new NoticeView();

window.onload = function() {
  eventer.emit('refresh');
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
