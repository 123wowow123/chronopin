/*jshint unused:false*/
'use strict';

(function () {

  let PinGroups;

  class Controller {

    constructor($window, $stateParams, $state, $scope, profileWebService, ScrollUtil, searchService, Util, pinApp, Auth, appConfig, commentJs, notificationJs, $log, $timeout) {
      // constants
      const omitLinkHeaderProp = ['rel', 'url'];
      const scrollEl = ScrollUtil.getScrollEl();

      // stateParams Service
      this.$stateParams = $stateParams;

      // angular service
      this.$timeout = $timeout;
      this.$log = $log;
      this.$scope = $scope;
      this.$state = $state;
      this.$window = $window;

      // data service
      this.profileWebService = profileWebService;

      // util service
      this.ScrollUtil = ScrollUtil;
      this.searchService = searchService;
      this.Util = Util;

      // model service
      this.pinApp = pinApp;
      this.bags;
      this.commentJs = commentJs;
      this.notificationJs = notificationJs;

      // properties
      this.isAdmin = Auth.isAdmin; //bind function so each digest loop it get re-evaluated to determin latest state
      this.appConfig = appConfig;

      this.registeredListeners = {};

      this.searching = false;
      this.noSearchResult = false;
    }

    $onInit() {
      this.loading = true;
      this.profileWebService.getAggregateUnread()
        .then(res => {
          this._setSearchPinGroups(res.data.pins);
          this.notificationJs.refresh();
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

    _setSearchPinGroups(pins) {
      this.pinApp.clearSearchBags();
      this.pinApp.mergeSearchBagsWithPins(pins);
      this.bags = this.pinApp.getSearchBags();
    }

    getTodayPinId() {
      const bags = this.pinApp.findClosestFutureSearchBagByDateTime(new Date());
      if (bags) {
        const pins = bags.pins;
        this.closestFutureDates = pins;
        return pins && pins[0] && pins[0].id;
      }
    }

    $onDestroy() {
    }

    getTodaySearchScrollId() {
      return this.viewType === 'timeline' ? this.pinApp.getTodaySearchScrollId() : this.getTodayPinId();
    }

    getTimelineStatus() {
      switch (true) {
        case this.loading:
          return 'loading';
        default:
          return 'show';
      }
    }

  }

  angular.module('chronopinNodeApp')
    .component('notification', {
      templateUrl: 'app/notification/notification.html',
      controller: Controller
    });
})();
