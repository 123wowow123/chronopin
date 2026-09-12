'use strict';

(function () {

  // Pin.address stores "Some Place @ 21.7250, 39.1080" (see pin-map.directive.js).
  // Strip the trailing coordinates and hand back just the place label.
  const COORDS = /@\s*-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?\s*$/;

  angular.module('chronopinNodeApp')
    .filter('locationLabel', function () {
      return function (address) {
        if (!address) return '';
        return address.replace(COORDS, '').trim().replace(/[,;]\s*$/, '');
      };
    });

})();
