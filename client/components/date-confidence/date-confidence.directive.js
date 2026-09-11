'use strict';

(function () {

  // Levels written by the confidence classifier, least to most certain.
  const LEVELS = {
    delayed: { label: 'DELAYED', title: 'The date has moved' },
    unknown: { label: 'UNVERIFIED', title: 'No wording about the date was found' },
    estimated: { label: 'ESTIMATED', title: 'A target, not a fixed date' },
    scheduled: { label: 'SCHEDULED', title: 'Given as scheduled' },
    confirmed: { label: 'CONFIRMED', title: 'Stated as firm' }
  };

  angular.module('chronopinNodeApp')
    .directive('dateConfidence', function () {
      return {
        templateUrl: 'components/date-confidence/date-confidence.html',
        restrict: 'E',
        scope: {
          level: '@',
          reasoning: '@',
          showReasoning: '<'
        },
        link: function (scope) {
          scope.$watch('level', function (level) {
            const key = (level || '').toLowerCase();
            scope.known = !!LEVELS[key];
            scope.key = key;
            scope.meta = LEVELS[key] || null;
          });
        }
      };
    });
})();
