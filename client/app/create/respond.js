'use strict';

angular.module('chronopinNodeApp')
  .config(function($stateProvider) {
    $stateProvider.state('respond', {
      url: '/respond/:respondId',
      template: '<create></create>'
    });
  });
