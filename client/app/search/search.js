'use strict';

angular.module('chronopinNodeApp')
  .config(function($stateProvider) {
    $stateProvider.state('search', {
      url: '/search?q',
      template: '<search></search>'
    });
  });
