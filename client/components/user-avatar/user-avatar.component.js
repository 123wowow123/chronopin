'use strict';

(function () {

  // A user's picture in a circle, or the first letter of their handle when
  // they have none or it fails to load. pictureUrl is either a full URL (a
  // Facebook or Google photo) or the name of a picture they uploaded, which
  // lives in the thumb container like a pin's thumbnail. Size it with
  // font-size or width/height on the element.
  class UserAvatarController {
    constructor($scope, $element, appConfig) {
      this.$scope = $scope;
      this.$element = $element;
      this.appConfig = appConfig;
      this.broken = false;
    }

    $onChanges(changes) {
      if (changes.pictureUrl) {
        this.broken = false;
      }
    }

    $postLink() {
      // An img's error event doesn't bubble, and the img comes and goes with
      // ng-if, so it is caught on the way down instead.
      this.onError = event => {
        if (event.target && event.target.tagName === 'IMG') {
          this.$scope.$applyAsync(() => {
            this.broken = true;
          });
        }
      };
      this.$element[0].addEventListener('error', this.onError, true);
    }

    $onDestroy() {
      this.$element[0].removeEventListener('error', this.onError, true);
    }

    src() {
      const url = this.pictureUrl;
      if (!url || this.broken) {
        return null;
      }
      return /^(https?:)?\/\//.test(url) ? url : this.appConfig.thumbUrlPrefix + url;
    }

    initial() {
      return (this.userName || '').replace('@', '').charAt(0).toUpperCase();
    }
  }

  angular.module('chronopinNodeApp')
    .component('userAvatar', {
      controller: UserAvatarController,
      bindings: {
        userName: '<',
        pictureUrl: '<'
      },
      template: `
        <img class="user-avatar__image" ng-if="$ctrl.src()" ng-src="{{$ctrl.src()}}" alt="">
        <span class="user-avatar__initial" ng-if="!$ctrl.src()">{{$ctrl.initial()}}</span>`
    });

})();
