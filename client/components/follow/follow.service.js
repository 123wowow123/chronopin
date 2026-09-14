'use strict';

(function () {

  // Follow/unfollow calls. Every call resolves the followed user's status
  // ({userId, followerCount, followingCount, following, followsYou}) and
  // broadcasts it as 'follow:changed', so any other button or notification
  // showing the same user can update without asking the server again.
  class FollowService {
    constructor($http, $rootScope) {
      this.$http = $http;
      this.$rootScope = $rootScope;
    }

    status(userId) {
      return this.$http.get(`/api/users/${userId}/follow`)
        .then(res => res.data);
    }

    // Who userId (must be the signed-in user) follows.
    listFollowing(userId) {
      return this.$http.get(`/api/users/${userId}/following`)
        .then(res => res.data.following);
    }

    follow(userId) {
      return this._change('POST', userId);
    }

    unfollow(userId) {
      return this._change('DELETE', userId);
    }

    _change(method, userId) {
      return this.$http({
        method,
        url: `/api/users/${userId}/follow`
      })
        .then(res => {
          this.$rootScope.$broadcast('follow:changed', res.data);
          return res.data;
        });
    }
  }

  angular.module('chronopinNodeApp')
    .service('followService', FollowService);
})();
