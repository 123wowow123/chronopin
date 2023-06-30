'use strict';

(function() {

  class FaceBook {
    constructor(appConfig) {
      this.initialized = this.loadFB(appConfig.fbAppId);
    }

    loadFB(fbAppId) {
      return new Promise((resolve, reject) => {
        $.ajaxSetup({
          cache: true
        });
        $.getScript('//connect.facebook.net/en_US/sdk.js', function() {
          FB.init({
            appId: fbAppId,
            autoLogAppEvents: true,
            xfbml: false,
            version: 'v2.10'
          });
          resolve(FB);
        });
      });
    }
  }

  angular.module('chronopinNodeApp.facebook')
    .service('fb', FaceBook);
})();
