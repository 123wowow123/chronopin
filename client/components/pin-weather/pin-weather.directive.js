'use strict';

(function () {

  // Weather at a pin's location on its start date, under the map on the pin
  // page. Renders nothing when the pin has no location or date, or the
  // lookup fails - it is extra context, never worth an error. Timeline cards
  // show the same lookup as pin-weather-icon.
  angular.module('chronopinNodeApp')
    .directive('pinWeather', function (pinWeatherService) {
      return {
        templateUrl: 'components/pin-weather/pin-weather.html',
        restrict: 'E',
        scope: {
          pinId: '@',
          // Changing either means a different answer, so they are watched even
          // though the lookup itself is by id.
          start: '@',
          latitude: '@',
          longitude: '@'
        },
        link: function (scope) {
          let request = 0;

          scope.$watchGroup(['pinId', 'start', 'latitude', 'longitude'], function (values) {
            const current = ++request;
            scope.weather = null;
            pinWeatherService.forPin(values[0], values[1], values[2], values[3])
              .then(weather => {
                if (current === request) {
                  scope.weather = weather;
                }
              });
          });
        }
      };
    });
})();
