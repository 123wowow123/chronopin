'use strict';

(function () {

  // For images that are a nice-to-have, like company logos hotlinked from the
  // company's own site: one that fails to load is hidden rather than shown as
  // a broken-image icon. A new src (a card reused for another pin) shows it
  // again.
  angular.module('chronopinNodeApp')
    .directive('hideBroken', function () {
      return {
        restrict: 'A',
        link: function (scope, element, attrs) {
          const img = element[0];

          function onError() {
            img.hidden = true;
          }

          attrs.$observe('src', function () {
            img.hidden = false;
          });

          element.on('error', onError);
          scope.$on('$destroy', function () {
            element.off('error', onError);
          });
        }
      };
    });
})();
