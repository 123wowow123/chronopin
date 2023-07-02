'use strict';

angular.module('chronopinNodeApp')
  .config(function($stateProvider) {
    $stateProvider.state('search', {
      url: '/search?q&f',
      template: '<search></search>',
      
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
