'use strict';

(function() {

  angular.module('chronopinNodeApp')
    .filter('timespan', function() {

      const EN_US_POSTFIXES = ["days", "years"];

      // format parameter can be 'd' | 'y' to output in days for year (where applicable)

      return function abbreviateTimeSpan(dateSpan, format) {
        format = format || 'd';
        const days = dateSpan.start.diff(dateSpan.end, 'days', true),
        absDays = Math.abs(days);

        if (absDays === 0) {
          return 'Today';
        } else if (format === 'y' && absDays >= 365) {
          let years = dateSpan.start.diff(dateSpan.end, 'years', true).toFixed(1);
          return pluralize('year', years, true);
        }
        return pluralize('day', days, true);

      };

    });

})();
