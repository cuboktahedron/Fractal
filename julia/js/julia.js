'use strict';

const paramView = new ParameterView();
const canvasView = new CanvasView(paramView);
const operationView = new OperationView();
const snapshotsView = new SnapshotsView();
const noticeView = new NoticeView();
const colorsetsView = new ColorsetsView();

window.onload = function() {
  let paramsss = location.href.split('?')[1];
  if (paramsss === undefined) {
    paramsss = '';
  }

  var urlParams = {}
  const paramss = paramsss.split('&');
  paramss.forEach(function(params) {
    const param = params.split('=');
    urlParams[param[0]] = param[1];
  });

  paramView.init(urlParams);
  colorsetsView.init(urlParams);
};
