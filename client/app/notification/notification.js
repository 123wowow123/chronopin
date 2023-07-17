'use strict';

angular.module('chronopinNodeApp')
  .config(function($stateProvider) {
    $stateProvider.state('notification', {
      url: '/notification',
      template: '<notification></notification>'
    });
  });
