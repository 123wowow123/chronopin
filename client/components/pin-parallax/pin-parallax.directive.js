'use strict';

(function () {

  // Wraps stephband's jparallax (the vendored jquery.parallax.js next door,
  // webdev.stephband.info/jparallax). The crop box is the mouseport: the
  // pointer's position within it drives the image, which glides to the target
  // under the plugin's exponential decay - that is the rubberbanding.
  //
  // yparallax below 1 is the plugin's own way of holding a layer off its
  // limits: the image covers that fraction of the hidden area, centred by
  // yorigin, so the edge of the crop is never reached.
  const OPTIONS = {
    xparallax: false, // the image is width:100%, so there is no room sideways
    yparallax: 0.9,
    yorigin: 0.5,

    // The plugin's default is 0.66 per frame, a ~70ms time constant, which
    // reads as far too fast here. 0.96 stretches the same curve to ~400ms.
    decay: 0.96
  };

  // Below this much hidden image there is nothing worth panning, so the box is
  // left at the image's own height and the effect is skipped.
  const MIN_ROOM = 24;

  angular.module('chronopinNodeApp')
    .directive('pinParallax', function () {
      return {
        restrict: 'A',
        link: function (scope, element) {
          const crop = element[0];
          let layer = null;

          // How tall the image renders at the current column width.
          function renderedHeight(img) {
            const width = crop.clientWidth;
            if (!width) {
              return 0;
            }

            // Once the file has decoded, its own dimensions are the truth. A
            // number of pins carry stale thumbWidth/thumbHeight - several
            // claim to be twice the height their blob actually is - so the
            // supplied figures are only good enough to reserve space with
            // before the download lands.
            if (img.complete && img.naturalWidth > 0) {
              return width * (img.naturalHeight / img.naturalWidth);
            }

            const w = parseFloat(img.getAttribute('data-actual-width'));
            const h = parseFloat(img.getAttribute('data-actual-height'));
            return w > 0 && h > 0 ? width * (h / w) : 0;
          }

          // The cap lives in the stylesheet, so read it back rather than
          // duplicating the viewport maths here.
          function cap() {
            const max = parseFloat(window.getComputedStyle(crop).maxHeight);
            return max > 0 ? max : Infinity;
          }

          function detach() {
            if (layer) {
              layer.unparallax();
              layer.css({ top: '', marginTop: '' });
              layer = null;
            }
          }

          // Real jQuery, not angular.element: index.html loads angular.js
          // before jquery.js, so Angular binds jqLite, which has no
          // .parallax().
          function attach(img, room) {
            layer = window.jQuery(img);

            // The plugin reads the layer's current CSS to work out where it
            // should pick up from, so put it at the resting position first -
            // centred, matching how the timeline cards crop. Left at its
            // default the image would sit flush with the top of the crop,
            // showing nothing above it. These are the same two properties
            // layerCss() writes, for pointer = yorigin.
            const rest = OPTIONS.yparallax * OPTIONS.yorigin +
              OPTIONS.yorigin * (1 - OPTIONS.yparallax);
            layer.css({
              top: rest * 100 + '%',
              marginTop: rest * (crop.clientHeight + room) * -1
            });

            layer.parallax(angular.extend({ mouseport: window.jQuery(crop) }, OPTIONS));
          }

          // Sizes the box to the image or the cap, whichever is smaller, and
          // turns the effect on only when that actually hides something.
          function apply() {
            const img = crop.querySelector('img');
            if (!img) {
              return;
            }

            detach();

            // A thumbnail whose blob is missing - and a number are - must not
            // leave a tall empty box behind on the strength of the dimensions
            // the database claims for it.
            if (img.complete && img.naturalWidth === 0) {
              crop.style.height = '';
              return;
            }

            const natural = renderedHeight(img);
            if (!natural) {
              return;
            }

            const height = Math.min(natural, cap());
            crop.style.height = Math.round(height) + 'px';

            const room = natural - height;
            if (room >= MIN_ROOM) {
              attach(img, room);
            }
          }

          // The plugin measures the layer once, at init, so a resize needs a
          // fresh box and a fresh attach rather than a nudge.
          let resizing = null;
          function onResize() {
            if (resizing) {
              window.clearTimeout(resizing);
            }
            resizing = window.setTimeout(function () {
              resizing = null;
              apply();
            }, 150);
          }

          window.addEventListener('resize', onResize);

          // The image is behind an ng-if, so wait for the element. Sizing can
          // happen straight away from the supplied dimensions; a reapply on
          // load covers images the API has no dimensions for.
          const settle = scope.$watch(function () {
            return crop.querySelector('img');
          }, function (img) {
            if (!img) {
              return;
            }
            settle();
            apply();
            // Always reapply once the file lands: the reservation above may
            // have been made from stale dimensions, and only the decoded image
            // settles the real height.
            img.addEventListener('load', apply);
            img.addEventListener('error', apply);
          });

          scope.$on('$destroy', function () {
            detach();
            window.removeEventListener('resize', onResize);
            if (resizing) {
              window.clearTimeout(resizing);
            }
          });
        }
      };
    });
})();
