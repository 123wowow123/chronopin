/*jshint unused:false*/
'use strict';

(function () {

  let PinApp, Bags;

  class MainController {

    constructor($scope, pinService, dateTimeService, mainService, pinApp, Auth, appConfig, modelInjector, $log, $timeout, socket) {
      //PinApp = PinApp || modelInjector.getPinApp();
      Bags = Bags || modelInjector.getBags();

      this.omitLinkHeaderProp = ['rel', 'url'];

      this.$timeout = $timeout;
      this.$log = $log;
      this.$scope = $scope;
      this.socket = socket;
      this.pinService = pinService;
      this.dateTimeService = dateTimeService;
      this.mainService = mainService;
      this.isAdmin = Auth.isAdmin; //bind function so each digest loop it get re-evaluated to determin latest state
      this.appConfig = appConfig;

      this.registeredListeners = {};
      this.pinApp = pinApp;
      this.bags;

      this.nextParam = null;
      this.prevParam = null;

      this.gettingNext = null;
      this.gettingPrev = null;

      this.loading = false;
      this.searching = false;
      this.noSearchResult = false;

      this.bagsOffset;
    }

    $onInit() {
      this.loading = true;
      this.mainService.list()
        .then(res => {
          this._setMainBagsWithPins(res.data);
          return res;
        })
        .then(res => {
          this.$scope.$on('navbar.search', (event, data) => {
            this._captureOffset(); // move these to pinService / add search and main varients!!!!
            this.searching = true;
            this.pinService.search({
              searchText: data.searchText
            })
              .then(res => {
                this._setSearchPinGroups(res.data.pins);
                this.searching = false;
              })
              .catch(err => {
                this.searching = false;
                throw err;
              });
          });
          return res;
        })
        .then(res => {
          this.$scope.$on('navbar.clearSearch', (event, data) => {
            this._switchPinGroups('main');
            if (angular.isNumber(this.bagsOffset)) {
              setTimeout(() => {
                this._resetToCaptureOffset();
              }, 0)
            }
          });
          return res;
        })
        .then(res => {
          this.prevParam = _.omit(res.data.linkHeader.previous, this.omitLinkHeaderProp);
          this.nextParam = _.omit(res.data.linkHeader.next, this.omitLinkHeaderProp);
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
    }

    // Click handlers

    addLike(pin) {
      let id = pin.id;
      if (id) {
        pin.hasLike = true;
        return this.pinService.like(id)
          .then(res => {
            pin.likeCount = res.data.likeCount;
          })
          .catch(err => {
            pin.hasLike = false;
            throw err;
          });
      }
    }

    removeLike(pin) {
      let id = pin.id;
      if (id) {
        pin.hasLike = false;
        return this.pinService.unlike(id)
          .then(res => {
            pin.likeCount = res.data.likeCount;
          })
          .catch(err => {
            pin.hasLike = false;
            throw err;
          });
      }
    }

    addFavorite(pin) {
      let id = pin.id;
      if (id) {
        pin.hasFavorite = true;
        return this.pinService.favorite(id)
          .then(res => {
            pin.favoriteCount = res.data.favoriteCount; //need to get value from server due to concurrency issue
          })
          .catch(err => {
            pin.hasFavorite = false;
          });
      }
    }

    removeFavorite(pin) {
      let id = pin.id;
      if (id) {
        pin.hasFavorite = false;
        return this.pinService.unfavorite(id)
          .then(res => {
            pin.favoriteCount = res.data.favoriteCount; //need to get value from server due to concurrency issue
          })
          .catch(err => {
            pin.hasFavorite = false;
            throw err;
          });
      }
    }

    // View functions

    getTimelineStatus() {
      switch (true) {
        case this.loading:
          return 'loading';
        case this.searching:
          return 'searching';
        case this.bags === this.pinApp.getSearchBags() && this.pinApp.getSearchBags().length:
          return 'found';
        case this.bags === this.pinApp.getBags() && !this.pinApp.getBags().length:
          return 'no match';
        default:
          return 'show';
      }
    }

    // Private helper functions

    _switchPinGroups(group) {
      switch (group) {
        case 'search':
          this.bags = this.pinApp.getSearchBags();
          break;
        default:
          this.bags = this.pinApp.getBags();
      }
      return this;
    }

    _setMainBagsWithPins(data, offsetY) {
      // debugger;
      let dateTime = new Date();

      this.pinApp.mergeBagsWithDateTimes(data.dateTimes);
      this.pinApp.mergeBagsWithPins(data.pins);

      this.$timeout(() => {
        scrollAdjust.bind(this)(dateTime, offsetY);
      });

      function scrollAdjust(dateTime, offsetY) {
        //debugger;
        let firstbag = this.pinApp.getBags().findClosestFutureBagByDateTime(dateTime);
        if (angular.isNumber(offsetY)) {
          this._resetToCaptureOffset();
        } else if (firstbag) {
          this._scrollToID(firstbag.toISODateTimeString());
        }
        this._registerInfinitScroll();
      }

      this._switchPinGroups('main');

      // this.pins = this.sortPins(res.data.pins);
      // this.socket.syncUpdates('pin', this.pins, () => {
      //   this.refresh();
      // }); //pin needs to map to correct obj
    }

    // ToDo: Not working
    _setSearchPinGroups(pins) {
      let dateTime = new Date();

      this._unRegisterInfinitScroll();

      this.pinApp.mergeSearchBagsWithPins(pins);

      let firstBag = this.pinApp.getSearchBags().findClosestFutureBagByDateTime(dateTime);

      this._switchPinGroups('search');

      if (firstBag) {
        this._scrollToID(firstBag.toISODateTimeString());
        // this._registerInfinitScroll();
      }
    }

    _captureOffset() {
      this.bagsOffset = document.documentElement.scrollTop || document.body.scrollTop;
      return this;
    }

    _resetToCaptureOffset() {
      return this._scrollTo(this.bagsOffset);
    }

    _findPos(obj) {
      let curtop = 0;
      if (obj.offsetParent) {
        do {
          curtop += obj.offsetTop;
        } while (!!(obj = obj.offsetParent));
        return curtop - 52 - 5; // add height of navbar main and additional 5px
      }
    }

    _getScrollHeight() {
      return document.documentElement.scrollHeight;
    }

    _scrollToID(id) {
      let pos = this._findPos(document.getElementById(id))
      return this._scrollTo(pos);
    }

    _scrollTo(y) {
      window.scroll(0, y);
      return this;
    }

    _registerInfinitScroll() {
      let scrolledBottom = this.$scope.$on('scrolled:bottom', (event, args) => {
        //debugger;
        if (!!this.gettingNext || !this.nextParam) {
          return;
        }
        this.gettingNext = true;
        this.mainService.list(this.nextParam)
          .then(res => {
            // No repositioning of scroll needed for scolling down.

            if (res.data.pins.length || res.data.dateTimes.length) {
              this.gettingNext = false;
              this.pinApp.mergeBagsWithDateTimes(res.data.dateTimes);
              this.pinApp.mergeBagsWithPins(res.data.pins);
              this.nextParam = res.data.linkHeader && _.omit(res.data.linkHeader.next, this.omitLinkHeaderProp);
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

      let scrolledTop = this.$scope.$on('scrolled:top', (event, args) => {
        //debugger;
        if (!!this.gettingPrev || !this.prevParam) {
          return;
        }

        this.gettingPrev = true;
        this.mainService.list(this.prevParam)
          .then(res => {
            let scrollHeightBefore,
              scrollHeightAfter,
              scrollHeightDelta;

            if (res.data.pins.length || res.data.dateTimes.length) {
              this.gettingPrev = false;

              this.pinApp.mergeBagsWithDateTimes(res.data.dateTimes);
              this.pinApp.mergeBagsWithPins(res.data.pins);

              this.prevParam = res.data.linkHeader && _.omit(res.data.linkHeader.previous, this.omitLinkHeaderProp);

              scrollHeightBefore = this._getScrollHeight();

              // no digest necessary
              setTimeout(() => {
                scrollHeightAfter = this._getScrollHeight();
                scrollHeightDelta = scrollHeightAfter - scrollHeightBefore;
                this._scrollTo(scrollHeightDelta);
              }, 0);

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
