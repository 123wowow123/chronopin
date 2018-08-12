/*jshint unused:false*/
'use strict';

(function () {

  class MainController {

    constructor($transitions, $scope, pinWebService, dateTimeWebService, mainWebService, ScrollUtil, Util, mainUtilService, pinApp, Auth, appConfig, $log, $timeout, socket) {

      // constants
      const omitLinkHeaderProp = ['rel', 'url'];

      // Plugin: https://github.com/gabceb/jquery-browser-plugin
      const isSafari = 	$.browser.ipad || $.browser.iphone || $.browser.ipod || $.browser.safari || $.browser.msedge;
      const scrollEl = isSafari ? document.body : document.documentElement; // Safari broke with documentElement

      // stateParams Service
      this.$transitions = $transitions;

      // angular service
      this.$timeout = $timeout;
      this.$log = $log;
      this.$scope = $scope;

      // data service
      this.socket = socket;
      this.pinWebService = pinWebService;
      this.dateTimeWebService = dateTimeWebService;
      this.mainWebService = mainWebService;

      // util service
      this.mainUtilService = mainUtilService;
      this.ScrollUtil = ScrollUtil;
      this.Util = Util;

      // model service
      this.pinApp = pinApp;
      this.bags;

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
      this.scrollToID = this.ScrollUtil.scrollToID.bind(null, scrollEl);
      this.scrollYTo = this.ScrollUtil.scrollYTo.bind(null, scrollEl);
      this.adjustScrollAfterPinInsert = this.ScrollUtil.adjustScrollAfterPinInsert.bind(null, scrollEl);
      this.adjustScrollRelativeToCurrentView = this.ScrollUtil.adjustScrollRelativeToCurrentView.bind(null, scrollEl);
    }

    $onInit() {
      this.loading = true;

      this.$transitions.onExit({ from: 'main' }, (transition) => {
        //debugger
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
        .then(res => {
          this.loading = false;
          return res;
        })
        .catch(err => {
          this.loading = false;
          throw err;
        });
    }

    $onDestroy() {
      this.socket.unsyncUpdates('pin');
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
      //debugger;
      event.target.bag.inView = event.inView;
    };

    // Private helper functions

    _setMainBagsWithPins(data) {
      // debugger;
      let dateTime = new Date();

      this.pinApp.mergeBagsWithDateTimes(data.dateTimes);
      this.pinApp.mergeBagsWithPins(data.pins);

      if (angular.isNumber(this.pinApp.bagsYOffset)) {
        this.$timeout(() => {
          scrollAdjust.bind(this)(dateTime);
        });
      }

      function scrollAdjust(dateTime) {
        //debugger;
        let firstBag = this.pinApp.findClosestFutureBagByDateTime(dateTime);
        if (firstBag) {
          this.scrollToID(firstBag.toISODateTimeString());
        }
        this._registerInfinitScroll();
      }

      this.socket.syncUpdates('pin', (event, item) => { ////////////////////////////
        // debugger
        const inRange = this.pinApp.isWithinBagDateRange(new Date(item.utcStartDateTime));
        if (!inRange) {
          return;
        }

        switch (event) {
          case "pin:save":
            //debugger
            this.pinApp.getBagsFirstInViewAsc();
            this.pinApp.mergeBagsWithPins([item]);
              //debugger
              const relEl = this.ScrollUtil.getElementById(bag.toISODateTimeString());
              this.adjustScrollRelativeToCurrentView(relEl); //////
            break;

          case "pin:update":
          case "pin:favorite":
          case "pin:unfavorite":
          case "pin:like":
          case "pin:unlike":
            this.pinApp.mergeBagsWithPins([item]);
            break;
        }

        this.$scope.$apply();

      });

      this.bags = this.pinApp.getBags();
    }

    _registerInfinitScroll() {
      const scrolledBottom = this.$scope.$on('scrolled:bottom', (event, args) => {
        //debugger;
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
        //debugger;
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
