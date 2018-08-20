'use strict';

angular.module('chronopinNodeApp', [
    'chronopinNodeApp.auth',
    'chronopinNodeApp.admin',
    'chronopinNodeApp.constants',
    'chronopinNodeApp.model',
    'chronopinNodeApp.facebook',
    'chronopinNodeApp.loader',
    'chronopinNodeApp.google',
    'ngCookies',
    'ngResource',
    'ngSanitize',
    'btford.socket-io',
    'ui.router',
    'ui.bootstrap',
    'validation.match',
    'angular-loading-bar',
    'ig.linkHeaderParser',
    'angularGrid'
  ])
  .config(($urlRouterProvider, $locationProvider) => {
    $urlRouterProvider.otherwise('/');

    $locationProvider.html5Mode(true);
  })
  .config(['cfpLoadingBarProvider', (cfpLoadingBarProvider) => {
    cfpLoadingBarProvider.includeSpinner = false;
  }]);
  // .config(['uibDatepickerPopupConfig', function(uibDatepickerPopupConfig) {
  //   uibDatepickerPopupConfig.datepickerPopupTemplateUrl = 'components/templates/datepickerPopup/popup.html';
  //   uibDatepickerPopupConfig.beginDateText = "Match"
  // }]);
