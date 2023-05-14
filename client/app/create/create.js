'use strict';

angular.module('chronopinNodeApp')
  .config(function ($stateProvider) {
    $stateProvider.state('create', {
      url: '/create',
      template: '<create></create>'
    });
  });
