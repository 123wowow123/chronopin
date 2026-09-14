'use strict';

class ProfileController {
  //start-non-standard
  user = {};
  errors = {};
  loading = true;
  //end-non-standard

  constructor(Auth, $state, $http) {
    this.Auth = Auth;
    this.$state = $state;
    this.$http = $http;
  }

  uploadPicture(input) {
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }

    const data = new FormData();
    data.append('picture', file);

    this.pictureBusy = true;
    this.pictureError = null;

    return this.$http.put('/api/users/me/picture', data, {
      transformRequest: angular.identity,
      headers: { 'Content-Type': undefined }
    })
      .then(res => this._setPicture(res.data.pictureUrl))
      .catch(err => {
        this.pictureError = (err.data && err.data.message) || 'Your picture could not be uploaded. Please try again.';
      })
      .finally(() => {
        this.pictureBusy = false;
        // Lets the same file be chosen again after an error.
        input.value = '';
      });
  }

  removePicture() {
    this.pictureBusy = true;
    this.pictureError = null;
    return this.$http.delete('/api/users/me/picture')
      .then(() => this._setPicture(null))
      .catch(() => {
        this.pictureError = 'Your picture could not be removed. Please try again.';
      })
      .finally(() => {
        this.pictureBusy = false;
      });
  }

  _setPicture(pictureUrl) {
    this.user.pictureUrl = pictureUrl || undefined;
  }

  $onInit() {
    // disable screen
    this.Auth.getCurrentUser()
      .then((user) => {
        this.user = user;
        this.user.userNameNoPrefix = user.userName.substring(1);
      })
      .finally(() => {
        this.loading = false;
      });
  }

  patch(form) {
    this.loading = true;

    if (form.$valid) {
      this.Auth.patchUser({
        userName: '@'+this.user.userNameNoPrefix,
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        email: this.user.email
      })
        .then(() => {
          // Account created, redirect to home
          this.$state.go('main');
        })
        .catch(err => {
          err = err.data;
          this.errors = {};

          // Update validity of form fields that match the sequelize errors
          if (err.firstName || err.lastName) {
            angular.forEach(err.fields, field => {
              form[field].$setValidity('mongoose', false);
              this.errors[field] = err.message;
            });
          }
        })
        .finally(() => {
          this.loading = false;
        });
    }
  }
}

angular.module('chronopinNodeApp')
  .controller('ProfileController', ProfileController);

// ng-change doesn't fire for file inputs, so this runs the expression with
// `input` (the element) inside a digest whenever a file is chosen.
angular.module('chronopinNodeApp')
  .directive('profilePictureInput', function ($parse) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        const onSelect = $parse(attrs.profilePictureInput);
        element.on('change', () => {
          scope.$apply(() => onSelect(scope, { input: element[0] }));
        });
        scope.$on('$destroy', () => element.off('change'));
      }
    };
  });
