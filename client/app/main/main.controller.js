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
      //this.adjustScrollRelativeToCurrentView = this.ScrollUtil.adjustScrollRelativeToCurrentView.bind(null, scrollEl);
      this.captureYOffset = ScrollUtil.captureYOffset.bind(null, scrollEl);
      this.userScroll = false;
      this.skipFirtScrollTop = true;
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
        this.commentJs.ayncRefresh();
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

    // initScrollChecker() {
    //   const mouseEvent = (e) => {
    //     this.userScroll = true;
    //   }
    //   this.registeredListeners['mousedown'] = this.ScrollUtil.addEventListener('mousedown', mouseEvent);
    //   this.registeredListeners['wheel'] = this.ScrollUtil.addEventListener('wheel', mouseEvent);
    // }

    $onDestroy() {
      this._unRegisterInfinitScroll();
      if (this.registeredListeners['mousedown']) {
        this.registeredListeners['mousedown']();
        delete this.registeredListeners['mousedown'];
      }
      if (this.registeredListeners['wheel']) {
        this.registeredListeners['wheel']();
        delete this.registeredListeners['wheel'];
      }
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

    _setMainBagsWithPins(data) {
      this.pinApp.mergeBagsWithDateTimes(data.dateTimes);
      this.pinApp.mergeBagsWithPins(data.pins);

      if (angular.isNumber(this.pinApp.bagsYOffset)) {

        // Adjust scrollheight after all dependent resources such as stylesheets, scripts, iframes, and images are loaded
        // window.addEventListener('load', () => {
        //   this.$timeout(() => {
        //     const elId = this.pinApp.getTodayScrollId();
        //     if (!this.userScroll) {
        //       this._scrollAdjust(elId);
        //     }
        //   })
        // });

        this.$timeout(() => {
          const elId = this.pinApp.getTodayScrollId();
          let promise;
          if (!!this.pinApp.bagsYOffset) {
            promise = Promise.resolve(this.scrollYTo(this.pinApp.bagsYOffset));
          } else {
            promise = this._scrollAdjust(elId);
          }
          promise.then(() => {
            this._registerInfinitScroll();
            // this.initScrollChecker();
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
              this.pinApp.mergeBagsWithDateTimes(res.data.dateTimes);
              this.pinApp.mergeBagsWithPins(res.data.pins);
              this.nextParam = this.getLinkHeader(res.data.linkHeader, "next");
            } else {
              this.nextParam = null;
            }
          })
          .catch(err => {
            throw err;
          }).finally(() => {
            setTimeout(() => {
              this.gettingNext = false;
            }, 500);
          });
      });

      const scrolledTop = this.$scope.$on('scrolled:top', (event, args) => {
        if (this.skipFirtScrollTop) {
          this.skipFirtScrollTop = false;
          return;
        }
        if (!!this.gettingPrev || !this.prevParam) {
          return;
        }
        this.gettingPrev = true;
        this.mainWebService.list(this.prevParam)
          .then(res => {
            let promise = new Promise((resolve, reject) => {
              if (res.data.pins.length || res.data.dateTimes.length) {
                this.pinApp.mergeBagsWithDateTimes(res.data.dateTimes);
                this.pinApp.mergeBagsWithPins(res.data.pins);
                this.prevParam = this.getLinkHeader(res.data.linkHeader, "previous");
                this.adjustScrollAfterPinInsert(resolve);
              } else {
                this.prevParam = null;
                resolve();
              }
            });
            return promise;
          })
          .catch(err => {
            throw err;
          }).finally(() => {
            setTimeout(() => {
              this.gettingPrev = false;
            }, 500);
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
