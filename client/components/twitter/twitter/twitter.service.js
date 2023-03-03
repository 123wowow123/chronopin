'use strict';

(function () {

  class Twitter {
    constructor() {
      this.initalized = this.loadTwitter();
    }

    loadTwitter() {
      return new Promise((resolve, reject) => {
        $.ajaxSetup({
          cache: true
        });
        $.getScript('//platform.twitter.com/widgets.js', function () {
          resolve(twttr);
        });
      });
    }
  }

  angular.module('chronopinNodeApp.twitter')
    .service('twitterJs', Twitter);
})();
