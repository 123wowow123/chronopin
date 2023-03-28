'use strict';

class ProfileController {
  //start-non-standard
  user = {};
  errors = {};
  loading = true;
  //end-non-standard

  constructor(Auth, $state) {
    this.Auth = Auth;
    this.$state = $state;
  }

  $onInit() {
    // disable screen
    this.Auth.getCurrentUser()
      .then((user) => {
        this.user = user;
      })
      .finally(() => {
        this.loading = false;
      });
  }

  patch(form) {
    this.loading = true;

    if (form.$valid) {
      this.Auth.patchUser({
        userName: this.user.userName,
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
