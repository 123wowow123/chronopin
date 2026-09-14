'use strict';

(function () {

  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  function _pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  // Live countdown to a pin's start, with a bar that fills over the span from
  // when the pin was posted to when it starts. Once the start has passed it
  // stops ticking and says how long ago it started. An all-day pin starts at
  // the viewer's local midnight on its (UTC) date.
  angular.module('chronopinNodeApp')
    .directive('countdownMeter', function ($interval, Util) {
      return {
        templateUrl: 'components/countdown-meter/countdown-meter.html',
        restrict: 'E',
        scope: {
          start: '@',
          since: '@',
          allDay: '@'
        },
        link: function (scope) {
          let ticker = null;

          function stop() {
            if (ticker) {
              $interval.cancel(ticker);
              ticker = null;
            }
          }

          function update() {
            const startDate = scope.start && Util.pinLocalStart({
              utcStartDateTime: scope.start,
              allDay: scope.allDay === 'true'
            });
            const start = startDate ? startDate.getTime() : NaN;
            if (isNaN(start)) {
              scope.ready = false;
              stop();
              return;
            }

            const now = Date.now();
            const remaining = start - now;
            scope.ready = true;
            scope.started = remaining <= 0;

            if (scope.started) {
              scope.percent = 100;
              stop();
              return;
            }

            scope.days = Math.floor(remaining / DAY);
            scope.clock = [
              Math.floor(remaining % DAY / HOUR),
              Math.floor(remaining % HOUR / MINUTE),
              Math.floor(remaining % MINUTE / SECOND)
            ].map(_pad).join(':');

            // Without a usable posted date there is no span to measure, so the
            // bar sits empty rather than guessing one.
            const since = new Date(scope.since).getTime();
            const span = start - since;
            scope.percent = !isNaN(since) && span > 0 ?
              Math.min(100, Math.max(0, (now - since) / span * 100)) : 0;
          }

          function restart() {
            stop();
            update();
            if (scope.ready && !scope.started) {
              ticker = $interval(update, SECOND);
            }
          }

          scope.$watchGroup(['start', 'since', 'allDay'], restart);
          scope.$on('$destroy', stop);
        }
      };
    });
})();
