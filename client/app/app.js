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
  'chronopinNodeApp.share',
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ui.router',
  'ui.bootstrap',
  'validation.match',
  'angular-loading-bar',
  'ig.linkHeaderParser',
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
  .controller('AppCtrl', ($scope, searchService, $rootScope, MetaService, notificationJs, $transitions) => {
    // Initializes searchService singleton
    $rootScope.metaservice = MetaService;
    window.open = function (url, name, specs, replace) {
      // Prevent Popup ads from 3rd party
      console.info("ad blocked");
    }

    notificationJs.init();
  })
//   .run(['$rootScope', ($rootScope, $transitions) => {
//     // $rootScope.$on('$routeChangeSuccess', (event, current, previous) => {
//     //     $rootScope.title = current.$$route.title;
//     //     $rootScope.description = current.$$route.description;
//     //     $rootScope.keywords = current.$$route.keywords;
//     //     $rootScope.image = current.$$route.image;
//     // });

//  }]);