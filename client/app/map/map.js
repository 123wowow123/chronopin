'use strict';

angular.module('chronopinNodeApp')
  .config(function ($stateProvider) {
    $stateProvider.state('map', {
      url: '/map',
      template: '<pins-map></pins-map>'
    });

    // A child of map rather than a jump to the pin state, so the map (its
    // markers, zoom and filter) stays alive underneath while the pin is open,
    // and Back just closes the overlay. The pin component reads the id from
    // $stateParams, so it renders here unchanged.
    $stateProvider.state('map.pin', {
      url: '/pin/:id',
      views: {
        overlay: {
          template: '<pin></pin>'
        }
      }
    });
  });
