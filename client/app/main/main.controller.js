/*jshint unused:false*/
'use strict';

(function () {

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
      //   debugger
      //   if (angular.isNumber(this.pinApp.bagsYOffset)) {
      //     setTimeout(() => {
      //       this.scrollYTo(this.pinApp.bagsYOffset)
      //     }, 0);
      //   }
      // });

      if (window.mainPinData) { // && false  
        // Preloaded data
        let mainPinData = window.mainPinData
        this._setMainBagsWithPins(mainPinData);
        const linkHeader = this.linkHeaderParser.parse(mainPinData.link);
        this.prevParam = this.getLinkHeader(linkHeader, "previous");
        this.nextParam = this.getLinkHeader(linkHeader, "next");
        this.loading = false;
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

    // Private helper functions

    _scrollAdjust(elId) {
      if (elId) {
        return this.scrollToIDAsync(elId);
      }
      return Promise.resolve();
    }


    getHomeScrollId() {
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
        this.$timeout(() => {
          const elId = this.getHomeScrollId();
          this._scrollAdjust(elId).then(() => {
            this._registerInfinitScroll();
          })
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
