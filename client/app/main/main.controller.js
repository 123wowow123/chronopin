/*jshint unused:false*/
'use strict';

(function () {

  // Height of the fixed navbar, matching ScrollUtil's own offset.
  const NAV_OFFSET = 52;

  // How long to keep re-pinning the anchor after the last resize event, to
  // cover the deferred re-flow that crossing a breakpoint triggers.
  const RESIZE_HOLD_MS = 700;

  class MainController {

    constructor($transitions, $scope, $stateParams, pinWebService, dateTimeWebService, mainWebService, linkHeaderParser, ScrollUtil, Util, mainUtilService, pinApp, Auth, appConfig, postedSpan, $log, $timeout) {

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
      this.postedSpan = postedSpan;

      // model service
      this.pinApp = pinApp;
      this.bags;

      // properties
      this.Auth = Auth;
      this.isAdmin = Auth.isAdmin; //bind function so each digest loop it get re-evaluated to determin latest state
      this.appConfig = appConfig;

      this.registeredListeners = {};

      this.nextParam = null;
      this.prevParam = null;

      this.gettingNext = null;
      this.gettingPrev = null;

      this.loading = false;

      // The active "posted within" window: the span the API takes as
      // created_within, plus the phrase the filter used for it. Null is the
      // whole timeline.
      this.postedWithin = null;
      this.postedWithinLabel = null;
      this.sliderSteps = postedSpan.options().map(option => option.within);

      // What clicking the slider's "Posted within" label applies: the span
      // saved in Preferences, or the same 1-day fallback that page names as
      // "No preference". Replaced once the signed-in user is known.
      this.defaultSpan = postedSpan.DEFAULT_SPAN;

      // Bumped whenever the filter changes, so a page request already in
      // flight against the previous window is dropped rather than merged into
      // the timeline the new one just cleared.
      this.loadToken = 0;

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

      this._registerBrandReset();

      // The slider always applies whatever it shows - unlike the old
      // posted-filter combo, it has no "preview but don't apply yet" state -
      // so a saved preference now takes effect on load rather than just
      // pre-filling a closed control. Guarded on postedWithin still being
      // null, so a preference arriving late never overrides a filter change
      // someone already made while it was in flight.
      this.Auth.getCurrentUser()
        .then(user => {
          const preference = user && user.defaultFilterSpanPreference;
          if (preference) {
            this.defaultSpan = preference;
          }
          if (preference && !this.postedWithin) {
            this.setPostedWithin(preference, this.postedSpan.format(preference));
          }
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
        this._loadTimeline();
      }
    }

    $onDestroy() {
      this._unRegisterInfinitScroll();
      this._unRegisterResizeAnchor();
      this._unRegisterBrandReset();
    }

    // View functions

    getTimelineStatus() {
      switch (true) {
        case this.loading:
          return 'loading';
        // An empty result under a filter is an answer, not a failure, so it
        // gets its own message rather than the error one.
        case this._isTimelineEmpty() && !!this.postedWithin:
          return 'no filter match';
        case this._isTimelineEmpty():
          return 'no match';
        default:
          return 'show';
      }
    }

    // "in the last 1 day" reads badly where "in the last day" does not, and a
    // leading "1 " is the only case where the count adds nothing. Two-digit
    // counts are untouched, since the space is part of the match.
    postedWithinPhrase() {
      return (this.postedWithinLabel || '').replace(/^1 /, '');
    }

    // Called by the filter. Reloads from the server rather than hiding pins
    // locally: the timeline only ever holds the pages it has scrolled through,
    // so filtering in place would search a fraction of the pins and leave
    // infinite scroll paging through the unfiltered set.
    setPostedWithin(within, label) {
      if ((this.postedWithin || null) === (within || null)) {
        return;
      }
      this.postedWithin = within || null;
      this.postedWithinLabel = label || null;

      this.pinApp.clearBags();
      this.bags = this.pinApp.getBags();
      this._todayMarker = null;
      this.prevParam = null;
      this.nextParam = null;
      this.gettingNext = null;
      this.gettingPrev = null;

      this._loadTimeline();
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

    _resolveTodayMarker() {
      this._todayMarker = this.mainUtilService.resolveTodayMarker(this.bags, this._todayMarker);
      return this._todayMarker;
    }

    // Private helper functions

    // The brand link is this page's "start over": clear the filter and go back
    // to today. It lives in the navbar, which outlives this component, so it
    // arrives as a broadcast.
    _registerBrandReset() {
      this._unRegisterBrandReset();
      this.registeredListeners['main:reset'] = this.$scope.$on('main:reset', () => {
        this._resetToToday();
      });
    }

    _unRegisterBrandReset() {
      if (this.registeredListeners['main:reset']) {
        this.registeredListeners['main:reset']();
        delete this.registeredListeners['main:reset'];
      }
    }

    _resetToToday() {
      // Dropping a filter reloads, and that rebuilds the bags and scrolls to
      // today by itself. With no filter on there is nothing to reload, so the
      // scroll is all that is left to do.
      if (this.postedWithin) {
        this.setPostedWithin(null, null);
        return;
      }
      this.$timeout(() => this._scrollAdjust(this.getHomeScrollId()));
    }

    _isTimelineEmpty() {
      return this.bags === this.pinApp.getBags() && !this.pinApp.getBags().length;
    }

    // The query for a fresh first page. Later pages come from the Link header
    // instead, which carries the window the server resolved, so every page of
    // one scroll filters against the same instant.
    _listParams() {
      return this.postedWithin ? { 'created_within': this.postedWithin } : undefined;
    }

    _loadTimeline() {
      this.loading = true;
      const token = ++this.loadToken;

      return this.mainWebService.list(this._listParams())
        .then(res => {
          if (token !== this.loadToken) {
            return res;
          }
          this._setMainBagsWithPins(res.data);
          this.prevParam = this.getLinkHeader(res.data.linkHeader, "previous");
          this.nextParam = this.getLinkHeader(res.data.linkHeader, "next");
          return res;
        })
        .catch(err => {
          throw err;
        })
        .finally(() => {
          if (token !== this.loadToken) {
            return;
          }
          this.loading = false;
        });
    }

    _scrollAdjust(elId) {
      return this.mainUtilService.scrollAdjust(this.scrollToIDAsync, this.pinApp.getBags(), elId);
    }

    // Prefer the TODAY marker so "now" lands at the top of the page. When a
    // bag falls on today there is no marker row, and that bag is the target.
    getHomeScrollId() {
      return this.mainUtilService.todayScrollId(this.pinApp.getBags(), this._resolveTodayMarker());
    }

    _setMainBagsWithPins(data) {
      this.pinApp.mergeBagsWithDateTimes(data.dateTimes);
      this.pinApp.mergeBagsWithPins(data.pins);

      if (angular.isNumber(this.pinApp.bagsYOffset)) {

        // Adjust scrollheight after all dependent resources such as stylesheets, scripts, iframes, and images are loaded
        // Only worth binding for the first response: on a filter reload the
        // load event has already fired, so this would just stack dead handlers.
        if (!this._boundLoadScroll) {
          this._boundLoadScroll = true;
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
        }

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
        const token = this.loadToken;
        this.mainWebService.list(this.nextParam)
          .then(res => {
            // No repositioning of scroll needed for scolling down.

            if (token !== this.loadToken) {
              return; // the filter changed while this page was in flight
            }

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
        const token = this.loadToken;
        this.mainWebService.list(this.prevParam)
          .then(res => {

            if (token !== this.loadToken) {
              return; // the filter changed while this page was in flight
            }

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
