'use strict';

(function () {

  angular.module('chronopinNodeApp')
    .directive('todayMarker', function () {
      return {
        templateUrl: 'components/today-marker/today-marker.html',
        restrict: 'E',
        scope: {
          date: '<'
        }
      };
    });
})();
