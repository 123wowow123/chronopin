'use strict';

angular.module('chronopinNodeApp.auth', ['chronopinNodeApp.constants', 'chronopinNodeApp.util',
    'ngCookies', 'ui.router'
  ])
  .config(function($httpProvider) {
    $httpProvider.interceptors.push('authInterceptor');
  });
