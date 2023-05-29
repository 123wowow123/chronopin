'use strict';

angular.module('chronopinNodeApp')
  .controller('OauthButtonsCtrl', function ($window, $cookies, $state, $location) {
    this.loginOauth = function (provider, handle, validateFn) {
      if (validateFn()) {
        handle && handle.length > 1 ? $cookies.put('handle', handle) : $cookies.remove('handle');

        const redirect = $state.params.redirect;
        redirect && redirect.length > 0 ? $cookies.put('redirect', redirect) : $cookies.remove('redirect');

        $window.location.href = '/auth/' + provider;
      }
    };
  });
