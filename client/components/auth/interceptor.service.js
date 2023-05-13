'use strict';

(function () {

  function authInterceptor($rootScope, $q, $cookies, $injector, Util) {
    return {
      // Add authorization token to headers
      request(config) {
        config.headers = config.headers || {};
        if ($cookies.get('token') && Util.isSameOrigin(config.url)) {
          config.headers.Authorization = 'Bearer ' + $cookies.get('token');
        }
        return config;
      },

      // Intercept 401s and redirect you to login
      responseError(response) {
        if (response.status === 401) {
          $injector.get('$state')
            .go('login', { redirect: $injector.get('$location').path() });
          // remove any stale tokens
          $cookies.remove('token');
        }
        return $q.reject(response);
      }
    };
  }

  angular.module('chronopinNodeApp.auth')
    .factory('authInterceptor', authInterceptor);
})();
