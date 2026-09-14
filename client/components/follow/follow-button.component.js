'use strict';

(function () {

  // A Follow / Following toggle for one user, optionally with their follower
  // count. Hidden on your own handle. Signed out, it sends you to log in.
  class FollowButtonController {
    constructor($scope, $state, Auth, followService) {
      this.$scope = $scope;
      this.$state = $state;
      this.Auth = Auth;
      this.followService = followService;

      this.status = null;
      this.busy = false;
    }

    $onInit() {
      // Whether you follow someone depends on who you are, so signing in or
      // out (or switching account) reloads the status.
      this.$scope.$watch(() => this.Auth.getCurrentUserName(), (name, previous) => {
        if (name !== previous) {
          this.load();
        }
      });

      this.$scope.$on('follow:changed', (event, status) => {
        if (status.userId === this.userId) {
          this.status = status;
        }
      });
    }

    $onChanges(changes) {
      if (changes.userId) {
        this.status = null;
        this.load();
      }
    }

    load() {
      const userId = this.userId;
      if (!userId) {
        return;
      }
      return this.followService.status(userId)
        .then(status => {
          // A slow answer for a user this button no longer shows is dropped.
          if (userId === this.userId) {
            this.status = status;
          }
        })
        .catch(() => {
          this.status = null;
        });
    }

    isSelf() {
      const me = this.Auth.getCurrentUserName();
      return !!me && me.toLowerCase() === String(this.userName || '').toLowerCase();
    }

    toggle() {
      if (!this.Auth.isLoggedIn()) {
        this.$state.go('login');
        return;
      }
      if (this.busy || !this.status) {
        return;
      }
      this.busy = true;
      const request = this.status.following ?
        this.followService.unfollow(this.userId) :
        this.followService.follow(this.userId);
      return request
        .then(status => {
          this.status = status;
        })
        .finally(() => {
          this.busy = false;
        });
    }
  }

  angular.module('chronopinNodeApp')
    .component('followButton', {
      templateUrl: 'components/follow/follow-button.html',
      controller: FollowButtonController,
      bindings: {
        userId: '<',
        userName: '<',
        showCount: '<'
      }
    });
})();
