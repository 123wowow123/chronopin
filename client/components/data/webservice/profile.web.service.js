/*jshint unused:false*/
'use strict';

(function () {

  angular.module('chronopinNodeApp')
    .service('profileWebService', function ($q, $http) {

      this.getUserByUserName = function (userName) {
        return $http({
          url: '/api/users/profile',
          method: 'GET',
          params: {
            userName
          },
          ignoreLoadingBar: true
        });
      };

      // this.getFollows = function (userName) {
      //   return $http({
      //     url: '/api/users/follow',
      //     method: 'GET',
      //     params: {
      //       userName
      //     },
      //     ignoreLoadingBar: true
      //   });
      // };

      this.follow = function (userName) {
        return $http({
          url: '/api/users/follow',
          method: 'POST',
          params: {
            userName
          }
        });
      };

      this.unfollow = function (userName) {
        return $http({
          url: '/api/users/unfollow',
          method: 'POST',
          params: {
            userName
          }
        });
      };

      // Bell functionality
      this.getAggregateUnreadCount = function () {
        return $http({
          url: '/api/users/getAggregateUnreadCount',
          method: 'GET',
          ignoreLoadingBar: true
        });
      };

      this.getAggregateUnread = function () {
        return $http({
          url: '/api/users/getAggregateUnread',
          method: 'POST'
        });
      };

    });

})();
