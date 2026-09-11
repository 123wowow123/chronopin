/*jshint unused:false*/
'use strict';

(function () {

  // Element id of the TODAY marker row, so page load and the Today button can
  // scroll it to the top of the page.
  const TODAY_MARKER_ID = 'today-marker';

  // Height of the fixed navbar, matching ScrollUtil's own offset.
  const NAV_OFFSET = 52;

  // How long to keep re-pinning the anchor after the last resize event, to
  // cover the deferred re-flow that crossing a breakpoint triggers.
  const RESIZE_HOLD_MS = 700;

  // The marker row renders a moment after scrolling unblocks. Waiting for it
  // keeps this scroll and the one on window.load aimed at the same element -
  // aiming at different ones makes the page visibly jump seconds after load.
  const MARKER_WAIT_TRIES = 8;
  const MARKER_WAIT_MS = 150;

  class MainController {

    constructor($transitions, $scope, $stateParams, pinWebService, dateTimeWebService, mainWebService, linkHeaderParser, ScrollUtil, Util, mainUtilService, pinApp, Auth, appConfig, commentJs, $log, $timeout) {

      // constants
      const omitLinkHeaderProp = ['rel', 'url'];
      const scrollEl = ScrollUtil.getScrollEl();

      // stateParams Service
      this.$transitions = $transitions;
      this.$stateParams = $stateParams;

      // angular service
      this.$timeout = $timeout;
      this.$log = $log;
      this.$scope = $scope;

      // data service
      this.pinWebService = pinWebService;
      this.dateTimeWebService = dateTimeWebService;
      this.mainWebService = mainWebService;

      // util service
      this.mainUtilService = mainUtilService;
      this.ScrollUtil = ScrollUtil;
      this.Util = Util;
      this.linkHeaderParser = linkHeaderParser;

      // model service
      this.pinApp = pinApp;
      this.bags;
      this.commentJs = commentJs;

      // properties
      this.isAdmin = Auth.isAdmin; //bind function so each digest loop it get re-evaluated to determin latest state
      this.appConfig = appConfig;

      this.registeredListeners = {};

      this.nextParam = null;
      this.prevParam = null;

      this.gettingNext = null;
      this.gettingPrev = null;

      this.loading = false;

      // today marker
      this.now = new Date();
      this._todayMarker = null;

      // scroll properties
      // this.bagsYOffset;

      // partially applied functions
      this.getLinkHeader = this.Util.getLinkHeader.bind(null, omitLinkHeaderProp);
      this.captureYOffset = this.ScrollUtil.captureYOffset.bind(null, scrollEl);
      this.scrollToIDAsync = this.ScrollUtil.scrollToIDAsync.bind(null, scrollEl);
      this.scrollYTo = this.ScrollUtil.scrollYTo.bind(null, scrollEl);
      this.adjustScrollAfterPinInsert = this.ScrollUtil.adjustScrollAfterPinInsert.bind(null, scrollEl);
      this.adjustScrollRelativeToCurrentView = this.ScrollUtil.adjustScrollRelativeToCurrentView.bind(null, scrollEl);
    }

    $onInit() {
      this.loading = true;

      this.$transitions.onExit({ from: 'main' }, (transition) => {
        this.pinApp.bagsYOffset = this.captureYOffset();
      });

      // this.$transitions.onEnter({ to: 'main' }, (transition) => {
      //   if (angular.isNumber(this.pinApp.bagsYOffset)) {
      //     setTimeout(() => {
      //       this.scrollYTo(this.pinApp.bagsYOffset)
      //     }, 0);
      //   }
      // });

      if (_.has(window, 'mainPinData.link')) { // && false  
        // Preloaded data
        let mainPinData = _.get(window, 'mainPinData');
        this._setMainBagsWithPins(mainPinData);
        const linkHeader = this.linkHeaderParser.parse(mainPinData.link);
        this.prevParam = this.getLinkHeader(linkHeader, "previous");
        this.nextParam = this.getLinkHeader(linkHeader, "next");
        this.loading = false;
        // clear Preloaded data
        window.mainPinData = null;
      } else {
        this.mainWebService.list()
          .then(res => {
            this._setMainBagsWithPins(res.data);
            return res;
          })
          .then(res => {
            this.prevParam = this.getLinkHeader(res.data.linkHeader, "previous");
            this.nextParam = this.getLinkHeader(res.data.linkHeader, "next");
            return res;
          })
          .catch(err => {
            throw err;
          })
          .finally(() => {
            this.loading = false;
            this.commentJs.ayncRefresh();
          });
      }
    }

    $onDestroy() {
      this._unRegisterInfinitScroll();
      this._unRegisterResizeAnchor();
    }

    // View functions

    getTimelineStatus() {
      switch (true) {
        case this.loading:
          return 'loading';
        case this.bags === this.pinApp.getBags() && !this.pinApp.getBags().length:
          return 'no match';
        default:
          return 'show';
      }
    }

    updateInView(event) {
      event.target.bag.inView = event.inView;
    };

    // Index of the bag the TODAY marker is inserted before, or -1 when it
    // should not appear: either a bag already falls on today, in which case
    // that bag is highlighted instead, or there are no bags at all.
    todayMarkerIndex() {
      return this._resolveTodayMarker().index;
    }

    // Every bag is in the past, so the marker goes after the last one.
    todayMarkerAtEnd() {
      return this._resolveTodayMarker().atEnd;
    }

    // Called from ng-repeat, so the result is memoized per bag list rather
    // than rescanned on every digest.
    _resolveTodayMarker() {
      const bags = this.bags;
      const length = bags ? bags.length : 0;

      if (this._todayMarker && this._todayMarker.length === length) {
        return this._todayMarker;
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

      this._todayMarker = { length, index, atEnd };
      return this._todayMarker;
    }

    // Private helper functions

    _scrollAdjust(elId, attempt) {
      if (!elId) {
        return Promise.resolve();
      }
      return this.scrollToIDAsync(elId)
        .then(scrolled => {
          if (scrolled !== false) {
            return scrolled;
          }
          // Not rendered yet. Wait for it rather than aiming somewhere else,
          // so every scroll to "today" lands in the same place.
          const tries = attempt || 0;
          if (elId === TODAY_MARKER_ID && tries < MARKER_WAIT_TRIES) {
            return this.$timeout(() => this._scrollAdjust(elId, tries + 1), MARKER_WAIT_MS);
          }
          // It never appeared; settle for the bag it would sit in front of.
          const firstBag = this.pinApp.findClosestFutureBagByDateTime(new Date());
          if (firstBag) {
            return this.scrollToIDAsync(firstBag.toISODateTimeString());
          }
          return scrolled;
        });
    }


    getHomeScrollId() {
      // Prefer the TODAY marker so "now" lands at the top of the page. When a
      // bag falls on today there is no marker row, and that bag is the target.
      const marker = this._resolveTodayMarker();
      if (marker.index !== -1 || marker.atEnd) {
        return TODAY_MARKER_ID;
      }

      let firstBag = this.pinApp.findClosestFutureBagByDateTime(new Date());
      if (firstBag) {
        return firstBag.toISODateTimeString();
      }
      return null;
    }

    _setMainBagsWithPins(data) {
      this.pinApp.mergeBagsWithDateTimes(data.dateTimes);
      this.pinApp.mergeBagsWithPins(data.pins);

      if (angular.isNumber(this.pinApp.bagsYOffset)) {

        // Adjust scrollheight after all dependent resources such as stylesheets, scripts, iframes, and images are loaded
        window.addEventListener('load', () => {
          this.$timeout(() => {
            const elId = this.getHomeScrollId();
            this._scrollAdjust(elId)
              // .then(() => {
              //   console.log("document.documentElement.scrollTop)", document.documentElement.scrollTop);
              //   console.log("document.documentElement.scrollHeight", document.documentElement.scrollHeight);
              // });
          })
        });

        this.$timeout(() => {
          const elId = this.getHomeScrollId();
          this._scrollAdjust(elId).then(() => {
            this._registerInfinitScroll();
            // After the initial scroll, so the seeded anchor is where the page
            // actually landed rather than the top of the timeline.
            this._registerResizeAnchor();
          });
        });
      }
      this.bags = this.pinApp.getBags();
    }

    _registerInfinitScroll() {
      const scrolledBottom = this.$scope.$on('scrolled:bottom', (event, args) => {
        if (!!this.gettingNext || !this.nextParam) {
          return;
        }
        this.gettingNext = true;
        this.mainWebService.list(this.nextParam)
          .then(res => {
            // No repositioning of scroll needed for scolling down.

            if (res.data.pins.length || res.data.dateTimes.length) {
              this.gettingNext = false;
              this.pinApp.mergeBagsWithDateTimes(res.data.dateTimes);
              this.pinApp.mergeBagsWithPins(res.data.pins);
              this.nextParam = this.getLinkHeader(res.data.linkHeader, "next");
            } else {
              this.gettingNext = false;
              this.nextParam = null;
            }
          })
          .catch(err => {
            this.gettingNext = false;
            throw err;
          });
      });

      const scrolledTop = this.$scope.$on('scrolled:top', (event, args) => {
        if (!!this.gettingPrev || !this.prevParam) {
          return;
        }

        this.gettingPrev = true;
        this.mainWebService.list(this.prevParam)
          .then(res => {

            if (res.data.pins.length || res.data.dateTimes.length) {
              this.gettingPrev = false;

              this.pinApp.mergeBagsWithDateTimes(res.data.dateTimes);
              this.pinApp.mergeBagsWithPins(res.data.pins);

              this.prevParam = this.getLinkHeader(res.data.linkHeader, "previous");

              this.adjustScrollAfterPinInsert();

            } else {
              this.gettingPrev = false;
              this.prevParam = null;
            }
          })
          .catch(err => {
            this.gettingPrev = false;
            throw err;
          });
      });

      this._unRegisterInfinitScroll();
      this.registeredListeners['scrolled:bottom'] = scrolledBottom;
      this.registeredListeners['scrolled:top'] = scrolledTop;

    }

    // Resizing changes card widths, which changes image heights, which moves
    // everything above the viewport - a 1400px to 700px resize pushed the
    // timeline thousands of pixels off. The resize event only fires after that
    // reflow, so the anchor has to be recorded while scrolling instead, then
    // put back once the resize settles.
    _registerResizeAnchor() {
      this._unRegisterResizeAnchor();

      let frameQueued = false;
      let burstAnchor = null;
      let holdUntil = 0;
      let holding = false;

      const trackAnchor = () => {
        if (frameQueued || this._restoringAnchor) {
          return;
        }
        frameQueued = true;
        window.requestAnimationFrame(() => {
          frameQueued = false;
          if (!this._restoringAnchor) {
            this._viewAnchor = this._captureTimelineAnchor();
          }
        });
      };

      // Re-pins the anchor every frame until resizing has been quiet for
      // RESIZE_HOLD_MS. Crossing a breakpoint re-flows card widths - and so
      // every image height - a couple of hundred milliseconds after the resize
      // event returns, growing the document by thousands of pixels. A restore
      // at any single moment is either too early or too late for that, so this
      // just keeps holding until it stops moving.
      const holdFrame = () => {
        this._restoreTimelineAnchor(burstAnchor);
        if (Date.now() < holdUntil) {
          window.requestAnimationFrame(holdFrame);
          return;
        }
        holding = false;
        this._restoringAnchor = false;
      };

      const onResize = () => {
        // Freeze the pre-resize anchor for the whole burst; every position
        // measured from here on is already displaced.
        if (!this._restoringAnchor) {
          this._restoringAnchor = true;
          burstAnchor = this._viewAnchor;
        }
        holdUntil = Date.now() + RESIZE_HOLD_MS;
        this._restoreTimelineAnchor(burstAnchor);
        if (!holding) {
          holding = true;
          window.requestAnimationFrame(holdFrame);
        }
      };

      window.addEventListener('scroll', trackAnchor, { passive: true });
      window.addEventListener('resize', onResize);

      this.registeredListeners.resizeAnchor = () => {
        holdUntil = 0; // lets the frame loop end on its next tick
        window.removeEventListener('scroll', trackAnchor);
        window.removeEventListener('resize', onResize);
      };

      // Seed it, so a resize works even if the page is never scrolled.
      this._viewAnchor = this._captureTimelineAnchor();
    }

    _unRegisterResizeAnchor() {
      if (this.registeredListeners.resizeAnchor) {
        this.registeredListeners.resizeAnchor();
        delete this.registeredListeners.resizeAnchor;
      }
    }

    // Whatever sits at the top of the view: the pin if there is one, otherwise
    // the group. A group's own top is not enough - when its cards reflow to a
    // new width its height changes, so holding its top still moves you
    // hundreds of pixels within it.
    _captureTimelineAnchor() {
      const candidates = [
        this._firstVisible('li.grid.--timeline'),
        this._firstVisible('.timeline__group-container')
      ].filter(Boolean);

      if (!candidates.length) {
        return null;
      }
      return candidates.reduce((best, c) =>
        Math.abs(c.top - NAV_OFFSET) < Math.abs(best.top - NAV_OFFSET) ? c : best);
    }

    _firstVisible(selector) {
      const els = document.querySelectorAll(selector);
      for (let i = 0; i < els.length; i++) {
        const rect = els[i].getBoundingClientRect();
        if (rect.bottom > NAV_OFFSET && els[i].id) {
          return { id: els[i].id, top: rect.top };
        }
      }
      return null;
    }

    _restoreTimelineAnchor(anchor) {
      if (!anchor) {
        return;
      }
      const el = this.ScrollUtil.getElementById(anchor.id);
      if (!el) {
        return;
      }
      this.scrollYTo(this.captureYOffset() + el.getBoundingClientRect().top - anchor.top);
    }

    _unRegisterInfinitScroll() {
      if (this.registeredListeners['scrolled:bottom']) {
        this.registeredListeners['scrolled:bottom']();
        delete this.registeredListeners['scrolled:bottom'];
      }
      if (this.registeredListeners['scrolled:top']) {
        this.registeredListeners['scrolled:top']();
        delete this.registeredListeners['scrolled:top'];
      }
    }

  }

  angular.module('chronopinNodeApp')
    .component('main', {
      templateUrl: 'app/main/main.html',
      controller: MainController
    });
})();
