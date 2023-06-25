'use strict';

angular.module('chronopinNodeApp')
  .config(function ($stateProvider) {
    $stateProvider.state('pin', {
      url: '/pin/:id',
      template: '<pin></pin>',

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
