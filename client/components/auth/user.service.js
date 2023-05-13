'use strict';

(function() {

  function UserResource($resource) {
    return $resource('/api/users/:id/:controller', {
      id: '@id'
    }, {
      changePassword: {
        method: 'PUT',
        params: {
          controller: 'password'
        }
      },
      get: {
        method: 'GET',
        params: {
          id: 'me'
        }
      },
      update: {
        method: 'PATCH',
        params: {
          id: 'me'
        }
      }
    });
  }

  angular.module('chronopinNodeApp.auth')
    .factory('User', UserResource);
})();
