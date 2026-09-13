'use strict';

(function () {

  // Most seed thumbnails had to be rebuilt after the production blobs were
  // deleted, and a few pins' images are gone everywhere. When a thumbnail fails
  // to load, this tries the attribute's fallback URL (the pin's original image)
  // once. If that also fails it hides the image's link and marks the enclosing
  // .grid__media, so the card shows no broken-image icon and the company and
  // location overlays fall back to plain text.
  angular.module('chronopinNodeApp')
    .directive('imgFallback', function () {
      return {
        restrict: 'A',
        link: function (scope, element, attrs) {
          const img = element[0];
          const link = img.parentElement && img.parentElement.tagName === 'A' ? img.parentElement : null;
          let triedFallback = false;

          function setBroken(broken) {
            if (link) {
              link.style.display = broken ? 'none' : '';
            }
            const media = img.closest('.grid__media');
            if (media) {
              media.classList.toggle('grid__media--no-image', broken);
            }
          }

          function onError() {
            const fallback = attrs.imgFallback;
            if (!triedFallback && fallback && img.src !== fallback) {
              triedFallback = true;
              img.src = fallback;
              return;
            }
            setBroken(true);
          }

          // ngSrc sets src through $set, so a card reused for another pin
          // starts over. The fallback assignment above bypasses $set and does
          // not come through here.
          attrs.$observe('src', function () {
            triedFallback = false;
            setBroken(false);
          });

          element.on('error', onError);
          scope.$on('$destroy', function () {
            element.off('error', onError);
          });
        }
      };
    });
})();
