'use strict';

(function() {

  class ModalScrollerController {

    constructor() {}

    $onInit() {
      this.escEnabled = true;
    }

  }

  angular.module('chronopinNodeApp')
    .component('modalScroller', {
      templateUrl: 'components/modal-scroller/modal-backdrop.html',
      controller: ModalScrollerController
    });
})();
