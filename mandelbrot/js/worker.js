'use strict';

onmessage = (e) => {
  function absoluteUrl(href, relativePath) {
    var baseURL = href.replace(/\\/g, '/').replace(/\/[^\/]*$/, '/');
    return baseURL + relativePath;
  }
  
  const url = absoluteUrl(e.data.href, '../js/utils.js');
  importScripts(url);

  const output = calculation(e.data);
  postMessage({ end: true, output: output });
};

const calculation = (param) => {
  postMessage({ end: false, progress: 'ready for calculating...' });

  const centerX = param.center.re;
  const centerY = param.center.im;
  const zoom = param.zoom;
  const size = param.resolution;
  const maxRepeat = param.maxRepeat;
  const min = -1.0 * (1.0 / (zoom / 100));
  const max =  1.0 * (1.0 / (zoom / 100));
  const power = param.power;
  const cs = setup(size, min, max, centerX, centerY);
  const zs = setup(size, 0, 0, 0, 0);
  const output = initOutput(size, maxRepeat);
  let prevProgress = 0;

  for (let y = 0; y < size; y++) {
    let zi;
    let progress = Math.floor((y / size) * 100);
    if (progress - prevProgress >= 5) {
      postMessage({ end: false, progress: 'calculating... ' + progress + '%' });
      prevProgress = progress;
    }
  
    for (let x = 0; x < size; x++) {
      zi = zs[y][x];
      for (let n = 0; n < maxRepeat; n++) {
        if (zi.abs2() > 4.0) {
          output[y][x] = n;
          break;
        }

        const c = cs[y][x];

        if (power === 2) {
          zi = zi.mul(zi).add(c);
        } else {
          const zi0 = new MutableComplex(zi.re, zi.im);
          for (let p = 0; p < power; p++) {
            zi = zi.mul(zi0);
          }
          zi.add(c);
        }
      }
    }
  }

  return output;
}

const setup = (size, min, max, centerX, centerY) => {
  const xv = linspace(min + centerX, max + centerX, size);
  const yv = linspace(min + centerY, max + centerY, size);
  const mat2 = [];

  for (let y = 0; y < size; y++) {
    const mat = [];
    for (let x = 0; x < size; x++) {
      mat.push(new MutableComplex(xv[x], yv[y]))
    }
    mat2.push(mat);
  }

  return mat2;
}

const linspace = (min, max, size) => {
  const vec = [];
  const diff = max - min
  const delta = diff / size

  for (let i = 0; i < size; i++) {
    vec[i] = min + (i * delta)
  }

  return vec;
}

const initOutput = (size, maxRepeat) => {
  const output = [];
  
  for (let y = 0; y < size; y++) {
    output[y] = [];
    for (let x = 0; x < size; x++) {
      output[y][x] = maxRepeat;
    }
  }

  return output;
}

