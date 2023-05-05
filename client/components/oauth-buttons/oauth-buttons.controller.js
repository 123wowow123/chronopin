'use strict';

angular.module('chronopinNodeApp')
  .controller('OauthButtonsCtrl', function ($window, $cookies) {
    this.loginOauth = function (provider, handle, validateFn) {
      if (validateFn()) {
        handle && handle.length > 1 ? $cookies.put('handle', handle) : $cookies.remove('handle');
        $window.location.href = '/auth/' + provider;
      }
    };
  });
