'use strict';

(function () {

  angular.module('chronopinNodeApp.auth')
    .run(function ($rootScope, $state, Auth, $transitions) {
      // Redirect to login if route requires auth and the user is not logged in, or doesn't have required role
      $transitions.onEnter({ to: '**' }, (transition, param) => {
        if (!param.authenticate) {
          return;
        }
        if (typeof param.authenticate === 'string') {
          Auth.hasRole(param.authenticate, _.noop)
            .then(has => {
              if (has) {
                return;
              }
              return Auth.isLoggedIn(_.noop)
                .then(is => {
                  $state.go(is ? 'main' : 'login');
                });
            });
        } else {
          Auth.isLoggedIn(_.noop)
            .then(is => {
              if (is) {
                return;
              }
              $state.go('main');
            });
        }
      });

    });
})();
