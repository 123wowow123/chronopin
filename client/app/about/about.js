'use strict';

angular.module('chronopinNodeApp')
  .config(function($stateProvider) {
    $stateProvider.state('about', {
      url: '/about',
      template: '<about></about>'
    });
  });
