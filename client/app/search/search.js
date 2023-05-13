'use strict';

angular.module('chronopinNodeApp')
  .config(function($stateProvider) {
    $stateProvider.state('search', {
      url: '/search?q&f',
      template: '<search></search>'
    });
  });
