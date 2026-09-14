'use strict';

(function () {

  angular.module('chronopinNodeApp')
    .directive('todayMarker', function (specialtyDay) {
      return {
        templateUrl: 'components/today-marker/today-marker.html',
        restrict: 'E',
        scope: {
          date: '<'
        },
        link: function (scope) {
          scope.$watch('date', date => {
            scope.specialtyDays = [];
            if (date) {
              specialtyDay.namesOn(date).then(names => {
                if (scope.date === date) {
                  scope.specialtyDays = names;
                }
              });
            }
          });
        }
      };
    });
})();
