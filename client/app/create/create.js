'use strict';

angular.module('chronopinNodeApp')
  .config(function ($stateProvider) {
    $stateProvider.state('create', {
      url: '/create',
      template: '<create></create>',

      onEnter: () => {
        // scroll to top
        setTimeout(() => {
          document.documentElement.scrollTo({
            top: 0
          });
        }, 0);
      }
      
    });
  });
