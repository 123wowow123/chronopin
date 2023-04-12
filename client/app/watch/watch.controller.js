// /*jshint unused:false*/
// 'use strict';

// (function () {

//   let PinGroups;

//   class WatchController {

//     // constructor($scope, socket, pinWebService, Auth, appConfig, modelInjector, $log) {
//     //   PinGroups = PinGroups || modelInjector.getBags();

//     //   this.omitLinkHeaderProp = ['rel', 'url'];

//     //   this.$log = $log;
//     //   this.$scope = $scope;
//     //   this.socket = socket;
//     //   this.pinWebService = pinWebService;
//     //   this.isAdmin = Auth.isAdmin; //bind function so each digest loop it get re-evaluated to determin latest state
//     //   this.appConfig = appConfig;

//     //   this.registeredListeners = {};
//     //   this.masterPinGroups = new PinGroups();;
//     //   this.pinGroups;
//     //   this.searchPinGroups; // newed up on every search

//     //   this.nextParam = null;
//     //   this.prevParam = null;

//     //   this.gettingNext = null;
//     //   this.gettingPrev = null;

//     //   this.loading = false;
//     //   this.searching = false;
//     //   this.noSearchResult = false;

//     //   this.pinGroupsOffset;
//     // }

//     // $onInit() {
//     //   this.loading = true;
//     //   this.pinWebService.list({
//     //     hasFavorite: true
//     //   })
//     //     .then(res => {
//     //       this._setMainPinGroups(res.data.pins);
//     //       return res;
//     //     })
//     //     .then(res => {
//     //       this.$scope.$on('navbar.search', (event, data) => {
//     //         this._captureOffset();
//     //         this.searching = true;
//     //         this.pinWebService.search({
//     //           q: data.searchText,
//     //           f: true
//     //         })
//     //           .then(res => {
//     //             this._setSearchPinGroups(res.data.pins);
//     //             this.searching = false;
//     //           })
//     //           .catch(err => {
//     //             this.searching = false;
//     //             throw err;
//     //           });
//     //       });
//     //       return res;
//     //     })
//     //     .then(res => {
//     //       this.$scope.$on('navbar.clearSearch', (event, data) => {
//     //         this._setMainPinGroups(null, this.pinGroupsOffset);
//     //       });
//     //       return res;
//     //     })
//     //     .then(res => {
//     //       //this.prevParam = _.omit(res.data.linkHeader.previous, this.omitLinkHeaderProp);
//     //       //this.nextParam = _.omit(res.data.linkHeader.next, this.omitLinkHeaderProp);
//     //       return res;
//     //     })
//     //     .then(res => {
//     //       this.loading = false;
//     //       return res;
//     //     })
//     //     .catch(err => {
//     //       this.loading = false;
//     //       throw err;
//     //     });
//     // }

//     // $onDestroy() {
//     //   // this.socket.unsyncUpdates('pin');
//     // }

//     // reflowed($event) {
//     //   this.$scope.$emit('reflowed', $event);
//     //   return this;
//     // }

//     // addLike(pin) {
//     //   let id = pin.id;
//     //   if (id) {
//     //     pin.hasLike = true;
//     //     return this.pinWebService.like(id)
//     //       .then(res => {
//     //         pin.likeCount = res.data.likeCount;
//     //       })
//     //       .catch(err => {
//     //         pin.hasLike = false;
//     //       });
//     //   }
//     // }

//     // removeLike(pin) {
//     //   let id = pin.id;
//     //   if (id) {
//     //     pin.hasLike = false;
//     //     return this.pinWebService.unlike(id)
//     //       .then(res => {
//     //         pin.likeCount = res.data.likeCount;
//     //       })
//     //       .catch(err => {
//     //         pin.hasLike = false;
//     //       });
//     //   }
//     // }

//     // addFavorite(pin) {
//     //   let id = pin.id;
//     //   if (id) {
//     //     pin.hasFavorite = true;
//     //     return this.pinWebService.favorite(id)
//     //       .then(res => {
//     //         pin.favoriteCount = res.data.favoriteCount; //need to get value from server due to concurrency issue
//     //       })
//     //       .catch(err => {
//     //         pin.hasFavorite = false;
//     //       });
//     //   }
//     // }

//     // removeFavorite(pin) {
//     //   let id = pin.id;
//     //   if (id) {
//     //     pin.hasFavorite = false;
//     //     return this.pinWebService.unfavorite(id)
//     //       .then(res => {
//     //         pin.favoriteCount = res.data.favoriteCount; //need to get value from server due to concurrency issue
//     //       })
//     //       .catch(err => {
//     //         pin.hasFavorite = false;
//     //       });
//     //   }
//     // }

//     // getTimelineStatus() {
//     //   switch (true) {
//     //     case this.loading:
//     //       return 'loading';
//     //     case this.searching:
//     //       return 'searching';
//     //     case this.pinGroups === this.searchPinGroups && this.searchPinGroups.length:
//     //       return 'found';
//     //     case this.pinGroups === this.searchPinGroups && !this.searchPinGroups.length:
//     //       return 'no match';
//     //     default:
//     //       return 'show';
//     //   }
//     // }

//     // _switchPinGroups(group) {
//     //   switch (group) {
//     //     case 'search':
//     //       this.pinGroups = this.searchPinGroups;
//     //       break;
//     //     default:
//     //       this.pinGroups = this.masterPinGroups;
//     //   }
//     //   return this;
//     // }

//     // _setMainPinGroups(pins, offsetY) {
//     //   let dateTime = new Date(),
//     //     eventRecieved = 0,
//     //     pinGroupCreated = this.masterPinGroups.mergePins(pins),
//     //     unregisterReflowedHandler;

//     //   if (angular.isNumber(offsetY)) {
//     //     pinGroupCreated = this.masterPinGroups.length;
//     //   }

//     //   unregisterReflowedHandler = this.$scope.$on('reflowed', (event, data) => {
//     //     eventRecieved++;
//     //     if (pinGroupCreated === eventRecieved) {
//     //       let firstPinGroup = this.pinGroups.findPinGroupByDateTime(dateTime);
//     //       if (angular.isNumber(offsetY)) {
//     //         this._resetToCaptureOffset();
//     //       } else if (firstPinGroup) {
//     //         this._scrollToID(firstPinGroup.toISODateTimeString());
//     //       }
//     //       //this._registerInfinitScroll();
//     //       unregisterReflowedHandler();
//     //     }
//     //   });

//     //   this._switchPinGroups('main');

//     //   // this.pins = this.sortPins(res.data.pins);
//     //   // this.socket.syncUpdates('pin', this.pins, () => {
//     //   //   this.refresh();
//     //   // }); //pin needs to map to correct obj
//     // }

//     // _setSearchPinGroups(pins) {
//     //   //this.$scope.$on('navbar.search', (event, data) => {
//     //   this._unRegisterInfinitScroll()
//     //   this.searchPinGroups = new PinGroups();
//     //   let dateTime = new Date(),
//     //     eventRecieved = 0,
//     //     pinGroupCreated = this.searchPinGroups.mergePins(pins),
//     //     unregisterReflowedHandler;;

//     //   unregisterReflowedHandler = this.$scope.$on('reflowed', (event, data) => {
//     //     eventRecieved++;
//     //     if (pinGroupCreated === eventRecieved) {
//     //       let firstPinGroup = this.searchPinGroups.findPinGroupByDateTime(dateTime);
//     //       if (firstPinGroup) {
//     //         this._scrollToID(firstPinGroup.toISODateTimeString());
//     //         // this._registerInfinitScroll();
//     //       }
//     //       unregisterReflowedHandler();
//     //     }
//     //   });

//     //   this._switchPinGroups('search');

//     //   //});
//     // }

//     // _captureOffset() {
//     //   this.pinGroupsOffset = document.documentElement.scrollTop || document.body.scrollTop;
//     //   return this;
//     // }

//     // _resetToCaptureOffset() {
//     //   return this._scrollTo(this.pinGroupsOffset);

//     // }

//     // _findPos(obj) {
//     //   let curtop = 0;
//     //   if (obj.offsetParent) {
//     //     do {
//     //       curtop += obj.offsetTop;
//     //     } while (!!(obj = obj.offsetParent));
//     //     return curtop - 52 - 5; // add height of navbar main and additional 5px
//     //   }
//     // }

//     // _getScrollHeight() {
//     //   return document.documentElement.scrollHeight;
//     // }

//     // _scrollToID(id) {
//     //   let pos = this._findPos(document.getElementById(id))
//     //   return this._scrollTo(pos);
//     // }

//     // _scrollTo(y) {
//     //   window.scroll(0, y);
//     //   return this;
//     // }

//     // _registerInfinitScroll() {
//     //   let scrolledBottom = this.$scope.$on('scrolled:bottom', (event, args) => {
//     //     if (!!this.gettingNext || !this.nextParam) {
//     //       return;
//     //     }
//     //     this.gettingNext = true;
//     //     this.pinWebService.list(this.nextParam)
//     //       .then(res => {
//     //         // No repositioning of scroll needed for scolling down.
//     //         if (res.data.pins.length) {
//     //           this.gettingNext = false;
//     //           this.pinGroups.mergePins(res.data.pins);
//     //           this.nextParam = res.data.linkHeader && _.omit(res.data.linkHeader.next, this.omitLinkHeaderProp);
//     //         } else {
//     //           this.gettingNext = false;
//     //           this.nextParam = null;
//     //         }
//     //       })
//     //       .catch(err => {
//     //         this.gettingNext = false;
//     //       });
//     //   });

//     //   let scrolledTop = this.$scope.$on('scrolled:top', (event, args) => {
//     //     if (!!this.gettingPrev && this.prevParam) {
//     //       return;
//     //     }

//     //     this.gettingPrev = true;
//     //     this.pinWebService.list(this.prevParam)
//     //       .then(res => {
//     //         let scrollHeightBefore, scrollHeightAfter, scrollHeightDelta;

//     //         if (res.data.pins.length) {
//     //           let eventRecieved = 0,
//     //             pinGroupCreated = this.pinGroups.mergePins(res.data.pins);

//     //           this.gettingPrev = false;
//     //           //this.pinGroups.mergePins(res.data.pins);
//     //           this.prevParam = res.data.linkHeader && _.omit(res.data.linkHeader.previous, this.omitLinkHeaderProp);

//     //           scrollHeightBefore = this._getScrollHeight();

//     //           this.$scope.$on('reflowed', (event, data) => {
//     //             eventRecieved++;
//     //             if (pinGroupCreated === eventRecieved) {
//     //               scrollHeightAfter = this._getScrollHeight();
//     //               // console.log('Scroll height after pin arrives and timeout: ', scrollHeightAfter);
//     //               scrollHeightDelta = scrollHeightAfter - scrollHeightBefore
//     //               // console.log('Scroll height after pin arrives delta: ', scrollHeightDelta);
//     //               this._scrollTo(scrollHeightDelta);
//     //             }
//     //           });

//     //         } else {
//     //           this.gettingPrev = false;
//     //           this.prevParam = null;
//     //         }
//     //       })
//     //       .catch(err => {
//     //         this.gettingPrev = false;
//     //       });
//     //   });

//     //   if (this.registeredListeners['scrolled:bottom']) {
//     //     this.registeredListeners['scrolled:bottom']()
//     //   }
//     //   if (this.registeredListeners['scrolled:top']) {
//     //     this.registeredListeners['scrolled:top']()
//     //   }
//     //   this.registeredListeners['scrolled:bottom'] = scrolledBottom;
//     //   this.registeredListeners['scrolled:top'] = scrolledTop;
//     // }

//     // _unRegisterInfinitScroll() {
//     //   if (this.registeredListeners['scrolled:bottom']) {
//     //     this.registeredListeners['scrolled:bottom']();
//     //     delete this.registeredListeners['scrolled:bottom'];
//     //   }
//     //   if (this.registeredListeners['scrolled:top']) {
//     //     this.registeredListeners['scrolled:top']();
//     //     delete this.registeredListeners['scrolled:top'];
//     //   }
//     // }
//   }

//   angular.module('chronopinNodeApp')
//     .component('watch', {
//       templateUrl: 'app/watch/watch.html',
//       controller: WatchController
//     });
// })();
