/*jshint unused:false*/
'use strict';

(function () {

  class PinCommentController {
  }

  angular.module('chronopinNodeApp')
    .component('pinComment', {
      controller: PinCommentController,
      bindings: {
        comment: '<',
        pin: '<',
        parent: '<',
        pageCtrl: '<'
      },
      templateUrl: 'components/pinComment/pinComment.html',
    });
})();
