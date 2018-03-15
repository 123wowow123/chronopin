/*jshint unused:false*/
'use strict';

(function () {

  let PinsQuery;

  class PinController {

    constructor($scope, $stateParams, socket, pinService, Auth, appConfig, modelInjector, $log) {
      PinsQuery = PinsQuery || modelInjector.getPinsQuery();
      this.pinService = pinService;
      this.$stateParams = $stateParams;
      this.appConfig = appConfig;

      this.isAdmin = Auth.isAdmin; //bind function so each digest loop it get re-evaluated to determin latest state
      this.searching = false;
      this.pinReady = false;
      //this.pinApp = pinApp;
      this.pinsQuery = new PinsQuery(); ///////

      this.pin;
    }

    $onInit() {
      let id = +this.$stateParams.id;
      this.pinService.get(id)
        .then(res => {
          this.pin = res.data;
          this.pinReady = true;;
          return res;
        })
        .then(res => {

          this.searching = true;
          this.pinService.search({
            searchText: res.data.title
          })
          .then(res => {
            let pins = res.data.pins;

            pins = pins.filter(pin => {
              return pin.id !== id
            });
            //debugger;
            let bagsCreated = this.pinsQuery.mergePins(pins);
            
            this.searching = false;
          })
          .catch(err => {
            this.searching = false;
            throw err;
          });

        });
    }

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
          });
      }
    }

  }

  angular.module('chronopinNodeApp')
    .component('pin', {
      templateUrl: 'app/pin/pin.html',
      controller: PinController
    });
})();
