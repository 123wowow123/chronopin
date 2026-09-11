'use strict';

(function () {

  // Coordinates live at the end of the free-text Pin.address field as
  // "Some Place @ 21.7250, 39.1080". Everything before the @ is the label.
  const COORDS = /@\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

  function parseAddress(address) {
    if (!address) return null;
    const match = COORDS.exec(address);
    if (!match) return null;
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return {
      lat: lat,
      lng: lng,
      label: address.slice(0, match.index).trim().replace(/[,;]\s*$/, '')
    };
  }

  angular.module('chronopinNodeApp')
    .directive('pinMap', function ($timeout) {
      return {
        templateUrl: 'components/pin-map/pin-map.html',
        restrict: 'E',
        scope: {
          address: '@',
          title: '@'
        },
        link: function (scope, element) {
          let map = null;

          function destroy() {
            if (map) {
              map.remove();
              map = null;
            }
          }

          function build(place) {
            // The canvas sits behind ng-if="place", so it only exists once the
            // digest that set scope.place has rendered.
            const canvas = element[0].querySelector('.pin-map__canvas');
            if (!canvas || typeof L === 'undefined') return;

            destroy();
            map = L.map(canvas, {
              center: [place.lat, place.lng],
              zoom: 11,
              scrollWheelZoom: false
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(map);

            L.marker([place.lat, place.lng]).addTo(map)
              .bindPopup(scope.title || place.label || 'Location');

            // The surrounding panel is often still laying out on first paint,
            // which would leave Leaflet sized against a 0-height container.
            $timeout(function () {
              if (map) map.invalidateSize();
            }, 250);
          }

          scope.$watch('address', function (address) {
            const place = parseAddress(address);
            scope.place = place;
            if (!place) {
              destroy();
              return;
            }
            $timeout(function () {
              build(place);
            });
          });

          scope.$on('$destroy', destroy);
        }
      };
    });
})();
