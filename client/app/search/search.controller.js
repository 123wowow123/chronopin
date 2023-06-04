/*jshint unused:false*/
'use strict';

(function () {

    class SearchController {

        constructor($stateParams, $state, $scope, pinWebService, dateTimeWebService, mainWebService, ScrollUtil, searchService, Util, mainUtilService, pinApp, Auth, appConfig, commentJs, $log, $timeout) {

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

            // data service
            this.pinWebService = pinWebService;
            this.dateTimeWebService = dateTimeWebService;
            this.mainWebService = mainWebService;

            // util service
            this.mainUtilService = mainUtilService;
            this.ScrollUtil = ScrollUtil;
            this.searchService = searchService;
            this.Util = Util;

            // model service
            this.pinApp = pinApp;
            this.bags;
            this.commentJs = commentJs;

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
            if (this.searchService.lastNotification) {
                this.search = this.searchService.lastNotification.searchText;
                this.searchChoice = this.Util.sanitizeSearchChoice(this.searchService.lastNotification.searchChoiceText)
                this.submitSearch(
                    this.search,
                    this.searchChoice.value,
                );
            }

            const searchSubmitListener = this.$scope.$on('search:submit', (event, args) => {
                this.search = args.searchText;
                this.searchChoice = this.Util.sanitizeSearchChoice(args.searchChoiceText)

                this.submitSearch(
                    this.search,
                    this.searchChoice.value,
                );
            });
            this.registeredListeners['search:submit'] = searchSubmitListener;
        }

        submitSearch(search, filterValue) {
            const threadEmoji = this.appConfig.searchPrefix.threadEmoji;
            this.searching = true;
            let searchPromise;
            if (search && search.startsWith(threadEmoji)) {
                const pinId = +search.substring(threadEmoji.length);
                searchPromise = this.pinWebService.thread(pinId);
            } else {
                searchPromise = this.pinWebService.search({
                    q: search,
                    f: filterValue
                });
            }
            searchPromise
                .then(res => {
                    const pins = _.get(res, "data.pins", []);
                    this._setSearchPinGroups(pins);
                    return res;
                })
                .catch(err => {
                    throw err;
                })
                .finally(() => {
                    this.searching = false;
                    this.commentJs.ayncRefresh();
                });
        }

        $onDestroy() {
            if (this.registeredListeners['search:submit']) {
                this.registeredListeners['search:submit']();
                delete this.registeredListeners['search:submit'];
            }
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
            event.target.bag.inView = event.inView;
        };

        // Private helper functions

        _setSearchPinGroups(pins) {
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
