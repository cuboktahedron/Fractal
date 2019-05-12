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
