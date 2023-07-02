'use strict';

(function () {

  const onEnter = () => {
    // scroll to top
    setTimeout(() => {
      document.documentElement.scrollTo({
        top: 0
      });
    }, 0);
  }

  angular.module('chronopinNodeApp')
    .config(function ($stateProvider) {
      $stateProvider.state('login', {
        url: '/login?redirect',
        templateUrl: 'app/account/login/login.html',
        controller: 'LoginController',
        controllerAs: 'vm',
        onEnter
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
          controllerAs: 'vm',
          onEnter
        })
        .state('profile', {
          url: '/profile',
          templateUrl: 'app/account/profile/profile.html',
          controller: 'ProfileController',
          controllerAs: 'vm',
          authenticate: true,
          onEnter
        })
        .state('settings', {
          url: '/settings',
          templateUrl: 'app/account/settings/settings.html',
          controller: 'SettingsController',
          controllerAs: 'vm',
          authenticate: true,
          onEnter
        });
    });

})();
