'use strict';

const paramView = new ParameterView();
const canvasView = new CanvasView(paramView);
const operationView = new OperationView();
const snapshotsView = new SnapshotsView();
const noticeView = new NoticeView();
const colorsetsView = new ColorsetsView();

window.onload = function() {
  colorsetsView.init();
};
