'use strict';

(function () {

  // Pointer tilt for the timeline cards, after vanilla-tilt.js: the pointer's
  // position within a card maps to a rotation about the two in-plane axes, so
  // the corner under the pointer leans towards the viewer.
  //
  // The directive sits on the grid item and rotates the card inside it rather
  // than the item itself. The item carries `transition: all 400ms` from the
  // timeline's own styles, which would smear every pointer move into a lagging
  // glide; the card has no transition of its own, so it can be driven frame by
  // frame.

  // Rotation at the edges of the card. vanilla-tilt's default is 10deg either
  // side of centre, which on a card this tall pulls the text noticeably out of
  // plane; this is a quarter of that, enough to read as depth on the corners
  // without the card looking like it is being turned over.
  const MAX_TILT = 2.5;

  // Lower values exaggerate the depth; 1000px is vanilla-tilt's default.
  const PERSPECTIVE = 1000;

  // Easing applied only as the pointer arrives and leaves, so the card eases
  // out of and back into flat but tracks the pointer directly in between.
  const SETTLE_MS = 300;

  angular.module('chronopinNodeApp')
    .directive('pinTilt', function () {
      // A tilt that follows a pointer has nothing to follow on a touch screen,
      // and it is motion a reader may have asked not to be shown.
      const enabled = window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      return {
        restrict: 'A',
        link: function (scope, element) {
          if (!enabled) {
            return;
          }

          const host = element[0];
          let frame = null;
          let point = null;
          let easing = null;

          // The card belongs to pin-block, which compiles after this runs, so
          // it is looked up per use rather than held onto.
          function card() {
            return host.querySelector('.grid__panel');
          }

          function render() {
            frame = null;

            const el = card();
            if (!el || !point) {
              return;
            }

            const rect = el.getBoundingClientRect();
            if (!rect.width || !rect.height) {
              return;
            }

            // Offset from the centre, -0.5 to 0.5 across each axis.
            const x = (point.x - rect.left) / rect.width - 0.5;
            const y = (point.y - rect.top) / rect.height - 0.5;

            el.style.transform = 'perspective(' + PERSPECTIVE + 'px) ' +
              'rotateX(' + (y * 2 * MAX_TILT).toFixed(2) + 'deg) ' +
              'rotateY(' + (x * -2 * MAX_TILT).toFixed(2) + 'deg)';
          }

          function ease(el) {
            el.style.transition = 'transform ' + SETTLE_MS + 'ms ease-out';

            if (easing) {
              window.clearTimeout(easing);
            }
            easing = window.setTimeout(function () {
              easing = null;
              el.style.transition = '';
            }, SETTLE_MS);
          }

          function onMove(event) {
            point = { x: event.clientX, y: event.clientY };
            if (!frame) {
              frame = window.requestAnimationFrame(render);
            }
          }

          // mousemove is bound only while the pointer is over the card; a
          // timeline screen holds dozens of these.
          function onEnter(event) {
            const el = card();
            if (!el) {
              return;
            }
            ease(el);
            host.addEventListener('mousemove', onMove);
            onMove(event);
          }

          function onLeave() {
            host.removeEventListener('mousemove', onMove);
            if (frame) {
              window.cancelAnimationFrame(frame);
              frame = null;
            }
            point = null;

            const el = card();
            if (el) {
              ease(el);
              el.style.transform = '';
            }
          }

          host.addEventListener('mouseenter', onEnter);
          host.addEventListener('mouseleave', onLeave);

          scope.$on('$destroy', function () {
            onLeave();
            host.removeEventListener('mouseenter', onEnter);
            host.removeEventListener('mouseleave', onLeave);
            if (easing) {
              window.clearTimeout(easing);
            }
          });
        }
      };
    });
})();
