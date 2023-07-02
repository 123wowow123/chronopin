'use strict';

angular.module('chronopinNodeApp')
  .config(function ($stateProvider) {
    $stateProvider.state('main', {
      url: '/',
      template: '<main></main>',

      onEnter: () => {
        // https://stackoverflow.com/questions/7131909/facebook-callback-appends-to-return-url/18305085#18305085
        if (window.location.hash === "#_=_") {
          history.replaceState
            ? history.replaceState(null, null, window.location.href.split("#")[0])
            : window.location.hash = "";
        }
      }

    });
  });
