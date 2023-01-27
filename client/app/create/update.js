'use strict';

// Reuse Create component up gave it new url
angular.module('chronopinNodeApp')
  .config(function($stateProvider) {
    $stateProvider.state('update', {
      url: '/update/:id',
      template: '<create></create>'
    });
  });
