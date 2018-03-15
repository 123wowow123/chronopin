'use strict';

angular.module('chronopinNodeApp')
  .config(function($stateProvider) {
    $stateProvider.state('referral', {
      url: '/referral',
      template: '<referral></referral>'
    });
  });
