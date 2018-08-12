/*jshint unused:false*/
'use strict';

(function () {

    class SearchController {

        constructor($stateParams, $scope, pinWebService, dateTimeWebService, mainWebService, ScrollUtil, Util, mainUtilService, pinApp, Auth, appConfig, $log, $timeout, socket) {

            // constants
            const omitLinkHeaderProp = ['rel', 'url'];

            // Plugin: https://github.com/gabceb/jquery-browser-plugin
            const isSafari = $.browser.ipad || $.browser.iphone || $.browser.ipod || $.browser.safari || $.browser.msedge;
            const scrollEl = isSafari ? document.body : document.documentElement; // Safari broke with documentElement

            // stateParams Service
            this.$stateParams = $stateParams;

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

            this.searching = false;
            this.noSearchResult = false;

            // scroll properties
            this.bagsYOffset;

            // partially applied functions
            this.getLinkHeader = this.Util.getLinkHeader.bind(null, omitLinkHeaderProp);
            this.captureYOffset = this.ScrollUtil.captureYOffset.bind(null, scrollEl);
            this.scrollToID = this.ScrollUtil.scrollToID.bind(null, scrollEl);
            this.scrollYTo = this.ScrollUtil.scrollYTo.bind(null, scrollEl);
            this.adjustScrollAfterPinInsert = this.ScrollUtil.adjustScrollAfterPinInsert.bind(null, scrollEl);
            this.adjustScrollRelativeToCurrentView = this.ScrollUtil.adjustScrollRelativeToCurrentView.bind(null, scrollEl);
        }

        $onInit() {
            const searchText = this.$stateParams.q;

            this.searching = true;
            this.pinWebService.search({
                searchText: searchText
            })
                .then(res => {
                    this._setSearchPinGroups(res.data.pins);
                    this.searching = false;
                    return res;
                })
                .catch(err => {
                    this.searching = false;
                    throw err;
                });
        }

        $onDestroy() {

        }

        // View functions

        getTimelineStatus() {
            switch (true) {
                case this.searching:
                    return 'searching';
                case this.pinApp.getSearchBags().length:
                    return 'found';
                case !this.pinApp.getSearchBags().length:
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

        // ToDo: Not working
        _setSearchPinGroups(pins) {
            let dateTime = new Date();

            this.pinApp.clearSearchBags();
            this.pinApp.mergeSearchBagsWithPins(pins);
            this.bags = this.pinApp.getSearchBags();
        }


    }

    angular.module('chronopinNodeApp')
        .component('search', {
            templateUrl: 'app/search/search.html',
            controller: SearchController
        });
})();
