'use strict';

class FollowingController {
  //start-non-standard
  following = [];
  loading = true;
  //end-non-standard

  constructor($scope, Auth, followService) {
    this.Auth = Auth;
    this.followService = followService;

    // Each row's follow-button broadcasts this on unfollow, so the row can
    // drop out of the list without a reload.
    $scope.$on('follow:changed', (event, status) => {
      if (!status.following) {
        this.following = this.following.filter(u => u.id !== status.userId);
      }
    });
  }

  $onInit() {
    this.Auth.getCurrentUser()
      .then(user => {
        this.userId = user.id;
        return this.followService.listFollowing(user.id);
      })
      .then(following => {
        this.following = following;
      })
      .finally(() => {
        this.loading = false;
      });
  }
}

angular.module('chronopinNodeApp')
  .controller('FollowingController', FollowingController);
