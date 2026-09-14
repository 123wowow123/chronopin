'use strict';

(function () {

  // How far outside the viewport a card may be when its weather is fetched,
  // so the icon is usually there by the time the card scrolls in.
  const LOAD_MARGIN = '300px';

  // A small weather icon and the high temperature on a timeline card, with
  // the rest of what the pin page's strip shows in its title. Nothing renders
  // for a pin with no location or date, or when there is no weather for it.
  //
  // Waits until the card is near the viewport before asking: the timeline
  // holds hundreds of cards, each lookup is at least one Open-Meteo call on
  // the server, and a "typical" one is five.
  angular.module('chronopinNodeApp')
    .directive('pinWeatherIcon', function (pinWeatherService) {
      return {
        restrict: 'E',
        scope: {
          pinId: '<',
          start: '<',
          latitude: '<',
          longitude: '<'
        },
        template: `
          <span class="pin-weather-icon" ng-if="weather" ng-class="'pin-weather-icon--' + weather.kind"
            title="{{summary}}">
            <i class="fa {{weather.icon}}" aria-hidden="true"></i>
            <span class="pin-weather-icon__high" ng-if="weather.high">{{weather.high}}</span>
          </span>
        `,
        link: function (scope, element) {
          let request = 0;
          let visible = false;
          let observer = null;

          function load() {
            const current = ++request;
            scope.weather = null;
            if (!visible) {
              return;
            }
            pinWeatherService.forPin(scope.pinId, scope.start, scope.latitude, scope.longitude)
              .then(weather => {
                if (current !== request || !weather) {
                  return;
                }
                scope.weather = weather;
                scope.summary = [
                  weather.heading + (weather.label ? ': ' + weather.label : ''),
                  [weather.high, weather.low].filter(Boolean).join(' / ') + weather.unit,
                  weather.precipitation,
                  weather.wind && 'Wind ' + weather.wind
                ].filter(Boolean).join(' · ');
              });
          }

          scope.$watchGroup(['pinId', 'start', 'latitude', 'longitude'], values => {
            if (!pinWeatherService.hasPlaceAndDate(values[0], values[1], values[2], values[3])) {
              request++;
              scope.weather = null;
              return;
            }
            if (visible || !window.IntersectionObserver) {
              visible = true;
              load();
            } else if (!observer) {
              observer = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                  observer.disconnect();
                  visible = true;
                  scope.$applyAsync(load);
                }
              }, { rootMargin: LOAD_MARGIN });
              observer.observe(element[0]);
            }
          });

          scope.$on('$destroy', () => {
            if (observer) {
              observer.disconnect();
            }
          });
        }
      };
    });
})();
