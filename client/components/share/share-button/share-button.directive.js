'use strict';

(function () {
  class Controller {
    constructor() {
    }

    $onInit() {
    }

    share(data) {
      if (navigator.share && data) {
        navigator.share(data)
          .then((res) => {})
          .catch((err) => {
            console.log(`Error: ${err}`);
          });
      } else {
        console.log('Browser does not support sharing');
      }
    }
  }

  angular.module('chronopinNodeApp.share')
    .component('shareButton', {
      controller: Controller,
      controllerAs: 'vm',
      bindings: {
        data: '<'
      },
      templateUrl: 'components/share/share-button/share-button.html',
    });
})();