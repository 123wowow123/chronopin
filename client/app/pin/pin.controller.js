/*jshint unused:false*/
'use strict';

(function () {

  let PinsQuery;

  class PinController {

    constructor($scope, $stateParams, socket, pinWebService, searchService, Auth, appConfig, modelInjector, commentJs, $log) {
      PinsQuery = PinsQuery || modelInjector.getPinsQuery();
      this.pinWebService = pinWebService;
      this.$stateParams = $stateParams;
      this.appConfig = appConfig;
      this.commentJs = commentJs;
      this.searchService = searchService;

      this.isAdmin = Auth.isAdmin; //bind function so each digest loop it get re-evaluated to determin latest state
      this.searching = false;
      this.pinReady = false;
      //this.pinApp = pinApp;
      this.pinsQuery = new PinsQuery(); ///////

      this.pin;
    }

    $onInit() {
      let id = +this.$stateParams.id;
      this.pinWebService.get(id)
        .then(res => {
          this.pin = res.data;
          this.pinReady = true;
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
              this.commentJs.ayncRefresh();
            });
        });
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
      return !!_.get(this.pin, 'locations[0].address');
    }

    getGoogleMapUrl() {
      function googleMapEncode(location) {
        return location.address.replace(' ', '+')
      }
      function joinLocations(locations) {
        return locations.reduce((a, t) => {
          return a ? `${a}|` : '' + googleMapEncode(t);
        }, '');
      }

      const key = '?key=' + this.appConfig.gMapKey;
      let origin;
      let destination;
      let waypoints;
      let cloneLocations = _.get(this.pin, 'locations', []).slice(0);
      let locationLength = cloneLocations.length;

      if (locationLength === 0) {
        return '';
      } else if (locationLength === 1) {
        origin = googleMapEncode(cloneLocations.shift());
      } else if (locationLength === 2) {
        origin = googleMapEncode(cloneLocations.shift());
        destination = googleMapEncode(cloneLocations.pop());
      } else if (locationLength > 2) {
        origin = googleMapEncode(cloneLocations.shift());
        destination = googleMapEncode(cloneLocations.pop());
        waypoints = joinLocations(cloneLocations);
      }

      if (locationLength === 1) {
        return `https://www.google.com/maps/embed/v1/place` +
          key +
          `&q=${origin}`;
      } else {
        return `https://www.google.com/maps/embed/v1/directions` +
          key +
          `&origin=${origin}` +
          `${destination ? '&destination=' + destination : ''}` +
          `${waypoints ? '&waypoints=' + waypoints : ''}`;
      }

    }

  }

  angular.module('chronopinNodeApp')
    .component('pin', {
      templateUrl: 'app/pin/pin.html',
      controller: PinController
    });
})();
