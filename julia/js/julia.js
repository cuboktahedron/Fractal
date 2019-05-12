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

var newWorkerViaBlob = function(relativePath) {
  var baseURL = window.location.href.replace(/\\/g, '/').replace(/\/[^\/]*$/, '/');
  var array = ['importScripts("' + baseURL + relativePath + '");'];
  var blob = new Blob(array, {type: 'text/javascript'});
  var url = window.URL.createObjectURL(blob);
  return new Worker(url);
};

function calculation(param) {
  var newWorker = function(relativePath) {
    try {
      return newWorkerViaBlob(relativePath);
    } catch (e) {
      return new Worker(relativePath);
    }
  };

  const workerParam = Object.assign({}, param);
  workerParam.href = window.location.href;

  return new Promise(function(resolve) {
    const worker = newWorker('js/worker.js');
    worker.postMessage(workerParam);
    worker.onmessage = function(e) {
      resolve(e.data);
      worker.terminate();
    };
  });
}

