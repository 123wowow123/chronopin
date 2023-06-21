'use strict';

angular.module('chronopinNodeApp')
  .config(function ($stateProvider) {
    $stateProvider.state('login', {
      url: '/login?redirect',
      templateUrl: 'app/account/login/login.html',
      controller: 'LoginController',
      controllerAs: 'vm'
    })
      .state('logout', {
        url: '/logout?referrer',
        referrer: 'main',
        template: '',
        controller: function ($state, Auth) {
          let referrer = $state.params.referrer || $state.current.referrer || 'main';
          Auth.logout();
          $state.go(referrer);
        }
      })
      .state('signup', {
        url: '/signup',
        templateUrl: 'app/account/signup/signup.html',
        controller: 'SignupController',
        controllerAs: 'vm'
      })
      .state('profile', {
        url: '/profile',
        templateUrl: 'app/account/profile/profile.html',
        controller: 'ProfileController',
        controllerAs: 'vm',
        authenticate: true
      })
      .state('settings', {
        url: '/settings',
        templateUrl: 'app/account/settings/settings.html',
        controller: 'SettingsController',
        controllerAs: 'vm',
        authenticate: true
      });
  });
