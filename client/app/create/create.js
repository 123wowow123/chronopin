'use strict';

angular.module('chronopinNodeApp')
  .config(function($stateProvider) {
    $stateProvider.state('create', {
      url: '/create/:id',
      template: '<create></create>'
    });
  });
