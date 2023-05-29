'use strict';

angular.module('chronopinNodeApp', [
  'chronopinNodeApp.auth',
  'chronopinNodeApp.admin',
  'chronopinNodeApp.constants',
  'chronopinNodeApp.model',
  'chronopinNodeApp.facebook',
  'chronopinNodeApp.twitter',
  'chronopinNodeApp.loader',
  'chronopinNodeApp.google',
  'chronopinNodeApp.comment',
  'chronopinNodeApp.textEditor',
  'chronopinNodeApp.scroll',
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ui.router',
  'ui.bootstrap',
  'validation.match',
  'angular-loading-bar',
  'ig.linkHeaderParser',
  'angularGrid',
  'ng-sortable'
])
  .config(($urlRouterProvider, $locationProvider, $sceProvider) => {
    $urlRouterProvider.otherwise('/');
    $locationProvider.html5Mode(true);
    $sceProvider.enabled(false);
  })
  .config(['cfpLoadingBarProvider', (cfpLoadingBarProvider) => {
    cfpLoadingBarProvider.includeSpinner = false;
  }])
  // .config(['uibDatepickerPopupConfig', function(uibDatepickerPopupConfig) {
  //   uibDatepickerPopupConfig.datepickerPopupTemplateUrl = 'components/templates/datepickerPopup/popup.html';
  //   uibDatepickerPopupConfig.beginDateText = "Match"
  // }]);
  .controller('AppCtrl', function ($scope, searchService) {
    // Initializes searchService singleton
  });