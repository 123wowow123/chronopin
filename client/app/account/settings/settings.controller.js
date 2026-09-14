'use strict';

(function() {

  // The server accepts any password this long; the strength meter only
  // advises beyond it.
  const MIN_LENGTH = 3;

  const STRENGTH_LEVELS = [
    { level: 'weak', label: 'Weak', percent: 25 },
    { level: 'fair', label: 'Fair', percent: 50 },
    { level: 'good', label: 'Good', percent: 75 },
    { level: 'strong', label: 'Strong', percent: 100 }
  ];

  class SettingsController {

    constructor(Auth) {
      this.Auth = Auth;
      this.minLength = MIN_LENGTH;
      this.user = {};
      this.errors = {};
      this.show = {};
      this.saving = false;

      Auth.getCurrentUser()
        .then(user => {
          this.userName = user && user.userName;
        });
    }

    // View helpers. Matching and length are checked here rather than with
    // validation directives - the "match" and "mongoose-error" directives
    // this form once used don't exist in the app.

    newPasswordTooShort() {
      return (this.user.newPassword || '').length < MIN_LENGTH;
    }

    passwordsMatch() {
      return !!this.user.confirmPassword && this.user.confirmPassword === this.user.newPassword;
    }

    // Holds off while the confirmation is still shorter than the new
    // password, so it doesn't complain about every keystroke on the way, and
    // while there is no usable new password to match yet.
    showMismatch() {
      const confirm = this.user.confirmPassword || '';
      const password = this.user.newPassword || '';
      if (this.passwordsMatch() || this.newPasswordTooShort()) {
        return false;
      }
      return this.submitted || (!!confirm && confirm.length >= password.length);
    }

    // A rough guide: length, then variety of character types.
    strength() {
      const password = this.user.newPassword || '';
      let score = 0;
      if (password.length >= 8) { score++; }
      if (password.length >= 12) { score++; }
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) { score++; }
      if (/\d/.test(password)) { score++; }
      if (/[^A-Za-z0-9]/.test(password)) { score++; }
      return STRENGTH_LEVELS[Math.min(Math.max(score - 1, 0), STRENGTH_LEVELS.length - 1)];
    }

    changePassword(form) {
      this.submitted = true;
      this.message = '';

      if (!this.user.oldPassword || this.newPasswordTooShort() || !this.passwordsMatch()) {
        return;
      }

      this.saving = true;
      return this.Auth.changePassword(this.user.oldPassword, this.user.newPassword)
        .then(() => {
          this.message = 'Your password has been updated.';
          this.user = {};
          this.show = {};
          this.submitted = false;
          form.$setPristine();
          form.$setUntouched();
        })
        .catch(err => {
          this.errors.oldPassword = err && err.status === 403
            ? 'That isn\'t your current password.'
            : 'Something went wrong. Please try again.';
        })
        .finally(() => {
          this.saving = false;
        });
    }
  }

  angular.module('chronopinNodeApp')
    .controller('SettingsController', SettingsController);

})();
