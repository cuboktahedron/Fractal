'use strict';

const paramView = new ParameterView();
const canvasView = new CanvasView(paramView);
const operationView = new OperationView();
const snapshotsView = new SnapshotsView();
const noticeView = new NoticeView();
const colorsetsView = new ColorsetsView();

window.onload = function() {
  colorsetsView.init();
}

function calculation(resolution) {
  const maxRepeat = paramView.maxRepeat();

  const csre = paramView.csre();
  const csim = paramView.csim();
  const cs = new Complex(csre, csim);
  const centerX = paramView.centerX();
  const centerY = paramView.centerY();
  const zoom = paramView.zoom();
  const size = resolution;
  const min = -1.0 * (1.0 / (zoom / 100));
  const max =  1.0 * (1.0 / (zoom / 100));
  const zs = setup(size, min, max, centerX, centerY);
  const output = initOutput(size, maxRepeat);

  for (let y = 0; y < size; y++) {
    let zi;

    for (let x = 0; x < size; x++) {
      zi = zs[y][x];
      for (let n = 0; n < maxRepeat; n++) {
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
  const xv = linspace(min + centerX, max + centerX, size);
  const yv = linspace(min + centerY, max + centerY, size);
  const mat2 = [];

  for (let y = 0; y < size; y++) {
    const mat = [];
    for (let x = 0; x < size; x++) {
      mat.push(new Complex(xv[x], yv[y]))
    }
    mat2.push(mat);
  }

  return mat2;
}

function linspace(min, max, size) {
  const vec = [];
  const diff = max - min
  const delta = diff / size

  for (let i = 0; i < size; i++) {
    vec[i] = min + (i * delta)
  }

  return vec;
}

function initOutput(size, maxRepeat) {
  const output = [];
  
  for (let y = 0; y < size; y++) {
    output[y] = [];
    for (let x = 0; x < size; x++) {
      output[y][x] = maxRepeat;
    }
  }

  return output;
}
