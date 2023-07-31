/*jshint unused:false*/
'use strict';

(function () {
  const delayParse = 0;
  let PinsQuery;

  class PinController {

    constructor($stateParams, $window, pinWebService, searchService, Auth, appConfig, modelInjector, commentJs, Util, MetaService) {
      PinsQuery = PinsQuery || modelInjector.getPinsQuery();
      this.pinWebService = pinWebService;
      this.$stateParams = $stateParams;
      this.appConfig = appConfig;
      this.commentJs = commentJs;
      this.searchService = searchService;
      this.Util = Util;
      this.MetaService = MetaService;
      this.$window = $window;

      this.Auth = Auth;
      this.isAdmin = Auth.isAdmin; //bind function so each digest loop it get re-evaluated to determin latest state
      this.searching = false;
      this.pinReady = false;
      this.pinIsCreatedByUser = false;
      //this.pinApp = pinApp;
      this.pinsQuery = new PinsQuery();
      this.wide = $window.localStorage.getItem("wide") == "true";

      this.pin;

      this.shareDataMemoized = _.memoize((pin) => {
        return {
          title: pin.title,
          url: this.Util.getCurrentUrlWithoutHash()
        };
      }), ['title', 'id'];

    }

    $onInit() {
      let id = +this.$stateParams.id;
      this.pinWebService.get(id)
        .then(res => {
          this.pin = res.data;
          this.pinReady = true;
          this.Auth.checkPinIsCreatedByUser(this.pin.userId)
            .then(value => {
              this.pinIsCreatedByUser = value;
            });

          const meta = this.MetaService.extractMeta(_.get(this, 'pin'));

          this.MetaService.set(
            meta.title,
            meta.description,
            meta.mediaContent,
            this.Util.getCurrentUrlWithoutHash()
          );

          return res;
        })
        .then(res => {
          this.searching = true;
          this.pinWebService.search({
            q: res.data.title
          })
            .then(res => {
              let pins = res.data.pins;

              pins = pins.filter(pin => {
                return pin.id !== id
              });
              //debugger; // cannot remove need refactor
              let bagsCreated = this.pinsQuery.mergePins(pins);

              this.searching = false;
            })
            .catch(err => {
              this.searching = false;
              throw err;
            }).finally(() => {
              this.afterPinInit();
            });
        });
    }

    $onDestroy() {
      this.MetaService.reset();
    }

    afterPinInit() {
      this.commentJs.ayncRefresh();
    }

    addLike(pin) {
      let id = pin.id;
      if (id) {
        pin.hasLike = true;
        return this.pinWebService.like(id)
          .then(res => {
            pin.likeCount = res.data.likeCount;
          })
          .catch(err => {
            pin.hasLike = false;
          });
      }
    }

    removeLike(pin) {
      let id = pin.id;
      if (id) {
        pin.hasLike = false;
        return this.pinWebService.unlike(id)
          .then(res => {
            pin.likeCount = res.data.likeCount;
          })
          .catch(err => {
            pin.hasLike = false;
          });
      }
    }

    addFavorite(pin) {
      let id = pin.id;
      if (id) {
        pin.hasFavorite = true;
        return this.pinWebService.favorite(id)
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
        return this.pinWebService.unfavorite(id)
          .then(res => {
            pin.favoriteCount = res.data.favoriteCount; //need to get value from server due to concurrency issue
          })
          .catch(err => {
            pin.hasFavorite = false;
          });
      }
    }


    hasMap() {
      return this.Util.hasAddress(this.pin);
    }

    getGoogleMapUrl() {
      return this.Util.getGoogleMapUrl(this.pin);
    }

    toggleWide() {
      this.wide = !this.wide;
      this.$window.localStorage.setItem("wide", this.wide)
    }

    getShareData(pin) {
      return this.shareDataMemoized(pin);
    }

  }

  angular.module('chronopinNodeApp')
    .component('pin', {
      templateUrl: 'app/pin/pin.html',
      controller: PinController
    });
})();
