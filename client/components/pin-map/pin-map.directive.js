'use strict';

(function () {

  // Draws a pin's location from its latitude/longitude (Pin.location on the
  // server), labelled with its address. Renders nothing when either coordinate
  // is missing or out of range.
  function toPlace(latitude, longitude, address) {
    if (latitude === '' || latitude == null || longitude === '' || longitude == null) return null;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return {
      lat: lat,
      lng: lng,
      label: address || ''
    };
  }

  angular.module('chronopinNodeApp')
    .directive('pinMap', function ($timeout) {
      return {
        templateUrl: 'components/pin-map/pin-map.html',
        restrict: 'E',
        scope: {
          address: '@',
          latitude: '@',
          longitude: '@',
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

          scope.$watchGroup(['latitude', 'longitude', 'address'], function (values) {
            const place = toPlace(values[0], values[1], values[2]);
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
