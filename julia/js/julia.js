'use strict';

window.onload = () => {
  let paramsss = location.href.split('?')[1];
  if (paramsss === undefined) {
    paramsss = '';
  }

  var urlParams = {}
  const paramss = paramsss.split('&');
  paramss.forEach((params) => {
    const param = params.split('=');
    urlParams[param[0]] = param[1];
  });

  new MainView(urlParams);
}


