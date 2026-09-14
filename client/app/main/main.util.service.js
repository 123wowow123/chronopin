/*jshint unused:false*/
'use strict';

(function() {

  // Element id of the TODAY marker row's tag, the scroll target for "today".
  const TODAY_MARKER_ID = 'today-marker';

  // The marker row renders a moment after the bags do. Waiting for it keeps
  // every scroll to "today" aimed at the same element - aiming somewhere else
  // meanwhile makes the page visibly jump once it appears.
  const MARKER_WAIT_TRIES = 8;
  const MARKER_WAIT_MS = 150;

  // The TODAY marker and scroll-to-today, shared by every view that lays
  // pins out as a timeline of bags (the home timeline and search results).
  angular.module('chronopinNodeApp')
    .service('mainUtilService', function($timeout) {

      // Where the TODAY marker goes in a bag list: index is the bag it is
      // inserted before (-1 for none - no bags, or a bag already falls on
      // today and is highlighted instead), atEnd when every bag is in the
      // past. Called from ng-repeat on every digest, so pass the previous
      // result back in and it is reused until the list changes.
      this.resolveTodayMarker = (bags, previous) => {
        const length = bags ? bags.length : 0;
        if (previous && previous.bags === bags && previous.length === length) {
          return previous;
        }

        let index = -1;
        let atEnd = false;

        if (length) {
          // Bags run oldest first, so the first non-past bag decides it.
          for (let i = 0; i < length; i++) {
            const daysUntil = bags[i].getDateSince();
            if (daysUntil === 0) {
              break; // a bag is today; time-block highlights it
            }
            if (daysUntil > 0) {
              index = i;
              break;
            }
          }
          atEnd = index === -1 && bags[length - 1].getDateSince() < 0;
        }

        return { bags, length, index, atEnd };
      };

      // The element to bring to the top for "today": the marker when there is
      // one, otherwise the bag that falls on today (or the next one after).
      this.todayScrollId = (bags, marker) => {
        if (marker.index !== -1 || marker.atEnd) {
          return TODAY_MARKER_ID;
        }
        const firstBag = bags && bags.length && bags.findClosestFutureBagByDateTime(new Date());
        return firstBag ? firstBag.toISODateTimeString() : null;
      };

      // Scrolls elId to the top, waiting for the marker row to render if it
      // has not yet, and settling for today's bag if it never does.
      this.scrollAdjust = (scrollToIDAsync, bags, elId, attempt) => {
        if (!elId) {
          return Promise.resolve();
        }
        return scrollToIDAsync(elId)
          .then(scrolled => {
            if (scrolled !== false) {
              return scrolled;
            }
            const tries = attempt || 0;
            if (elId === TODAY_MARKER_ID && tries < MARKER_WAIT_TRIES) {
              return $timeout(() => this.scrollAdjust(scrollToIDAsync, bags, elId, tries + 1), MARKER_WAIT_MS);
            }
            const firstBag = bags && bags.length && bags.findClosestFutureBagByDateTime(new Date());
            if (firstBag) {
              return scrollToIDAsync(firstBag.toISODateTimeString());
            }
            return scrolled;
          });
      };

    });

})();
