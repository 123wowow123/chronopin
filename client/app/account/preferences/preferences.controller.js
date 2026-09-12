'use strict';

(function () {

  // What the select holds for "no preference". Null rather than an empty
  // string: ng-options only matches its empty option against null, and an ''
  // model shows Angular's unknown-option placeholder instead.
  const NO_PREFERENCE = null;

  class PreferencesController {

    constructor(Auth, postedSpan) {
      this.Auth = Auth;

      this.spanOptions = postedSpan.options();
      // Named in the "no preference" option, so the fallback is not a mystery.
      this.fallbackLabel = postedSpan.format(postedSpan.DEFAULT_SPAN);

      this.defaultFilterSpanPreference = NO_PREFERENCE;
      this.message = '';
      this.error = '';

      // Read in the constructor rather than $onInit: this is a routed
      // controller, not a component, so nothing calls the lifecycle hooks.
      Auth.getCurrentUser()
        .then(user => {
          this.defaultFilterSpanPreference =
            user.defaultFilterSpanPreference || NO_PREFERENCE;
        });
    }

    save() {
      this.message = '';
      this.error = '';

      return this.Auth.savePreferences({
        defaultFilterSpanPreference: this.defaultFilterSpanPreference || null
      })
        .then(() => {
          this.message = 'Preferences saved.';
        })
        .catch(() => {
          this.error = 'Your preferences could not be saved.';
        });
    }
  }

  angular.module('chronopinNodeApp')
    .controller('PreferencesController', PreferencesController);

})();
