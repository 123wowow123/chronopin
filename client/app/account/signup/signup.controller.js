'use strict';

class SignupController {
  //start-non-standard
  user = {};
  errors = {};
  submitted = false;
  //end-non-standard

  constructor(Auth, $state) {
    this.Auth = Auth;
    this.$state = $state;
  }

  register(form) {
    this.submitted = true;
    if (form.$valid) {
      this.Auth.createUser({
        userName: '@' + this.user.userNameNoPrefix,
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        email: this.user.email,
        password: this.user.password
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
        });
    }
  }

  validateSocialSubmition(valid) {
    this.socialSubmitted = true;
    return valid;
  }

  // checkHandle(handle) {
  //   const prefixedHandle = '@' + handle;
  //   this.Auth.checkHandle(prefixedHandle).then((res) => {
  //     const data = res.data;
  //     this.handleAvailable = data.available;
  //   }).catch((err) => {
  //     this.handleAvailable = false;
  //     console.error(err);
  //   })
  // }
}

angular.module('chronopinNodeApp')
  .controller('SignupController', SignupController);
