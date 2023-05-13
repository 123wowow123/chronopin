'use strict';

(function () {

  class LoginController {
    constructor(Auth, $state, $location) {
      this.user = {};
      this.errors = {};
      this.submitted = false;

      this.Auth = Auth;
      this.$state = $state;
      this.$location = $location;
    }

    login(form) {
      this.submitted = true;

      if (form.$valid) {
        this.Auth.login({
          email: this.user.email,
          password: this.user.password
        })
          .then(() => {
            // Logged in, redirect to redirect url or home
            let redirect = this.$state.params.redirect || this.$state.current.redirect;
            if (redirect) {
              this.$location.path(redirect)
            } else {
              this.$state.go("main");
            }
          })
          .catch(err => {
            this.errors.other = err.message;
          });
      }
    }

    validate() {
      return true;
    }
  }

  angular.module('chronopinNodeApp')
    .controller('LoginController', LoginController);

})();
