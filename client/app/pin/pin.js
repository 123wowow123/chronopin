'use strict';

angular.module('chronopinNodeApp')
  .config(function($stateProvider) {
    $stateProvider.state('pin', {
    url: '/pin/:id',
      template: '<pin></pin>'
    });
  });
