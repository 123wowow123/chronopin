/*jshint unused:false*/
'use strict';

(function () {

    class SearchController {

        constructor($stateParams, $state, $scope, pinWebService, dateTimeWebService, mainWebService, ScrollUtil, Util, mainUtilService, pinApp, Auth, appConfig, postedSpan, $log, $timeout) {

            // constants
            const omitLinkHeaderProp = ['rel', 'url'];

            // Plugin: https://github.com/gabceb/jquery-browser-plugin
            const isSafari = $.browser.ipad || $.browser.iphone || $.browser.ipod || $.browser.safari || $.browser.msedge;
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
            this.Util = Util;

            // model service
            this.pinApp = pinApp;
            this.bags;

            // properties
            this.Auth = Auth;
            this.isAdmin = Auth.isAdmin; //bind function so each digest loop it get re-evaluated to determin latest state
            this.appConfig = appConfig;

            this.registeredListeners = {};

            this.searching = false;
            this.noSearchResult = false;

            // The same "posted within" slider as the timeline. Search answers
            // with its whole result set in one response rather than pages, so
            // the window is applied here, over that list, instead of being
            // sent to the server as created_within.
            this.postedSpan = postedSpan;
            this.sliderSteps = postedSpan.options().map(option => option.within);
            this.postedWithin = null;
            this.postedWithinLabel = null;
            this.defaultSpan = postedSpan.DEFAULT_SPAN;
            this._searchPins = [];

            // today marker, as on the timeline
            this.now = new Date();
            this._todayMarker = null;
            this.scrollToIDAsync = ScrollUtil.scrollToIDAsync.bind(null, scrollEl);

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
            const query = this.$stateParams.q;
            const filter = this.Util.sanitizeSearchChoice(this.$stateParams.f);
            const filterValue = filter && filter.value;

            if (!query && !filterValue) {
                return this.$state.go('main');
            }

            // Only for the label's "use your default" click. Unlike the
            // timeline, a search is not narrowed by it on load - a search is
            // an explicit ask, so it starts showing every match.
            this.Auth.getCurrentUser()
                .then(user => {
                    const preference = user && user.defaultFilterSpanPreference;
                    if (preference) {
                        this.defaultSpan = preference;
                    }
                });

            this.searching = true;
            this.pinWebService.search({
                q: query,
                f: filterValue
            })
                .then(res => {
                    this._searchPins = res.data.pins || [];
                    this._setSearchPinGroups(this._filteredPins());
                    return res;
                })
                .catch(err => {
                    throw err;
                }).finally(() => {
                    this.searching = false;
                });
        }

        $onDestroy() {

        }

        // View functions

        getTimelineStatus() {
            switch (true) {
                case this.searching:
                    return 'searching';
                // Compared as a boolean: switch (true) is strict, so a bare
                // length (a number) would never match.
                case this.pinApp.getSearchBags().length > 0:
                    return 'found';
                // Matches exist, the window just excludes them all - a
                // different message from finding nothing at all.
                case !!this.postedWithin && this._searchPins.length > 0:
                    return 'no filter match';
                case !this.pinApp.getSearchBags().length:
                    return 'no match';
                default:
                    return 'show';
            }
        }

        // Same trim as the timeline's: "in the last day", not "in the last 1 day".
        postedWithinPhrase() {
            return (this.postedWithinLabel || '').replace(/^1 /, '');
        }

        // Called by the slider.
        setPostedWithin(within, label) {
            if ((this.postedWithin || null) === (within || null)) {
                return;
            }
            this.postedWithin = within || null;
            this.postedWithinLabel = label || null;
            this._setSearchPinGroups(this._filteredPins());
        }

        todayMarkerIndex() {
            return this._resolveTodayMarker().index;
        }

        todayMarkerAtEnd() {
            return this._resolveTodayMarker().atEnd;
        }

        // Also what the floating Today button scrolls to.
        getHomeScrollId() {
            return this.mainUtilService.todayScrollId(this.bags, this._resolveTodayMarker());
        }

        updateInView(event) {
            //debugger;
            event.target.bag.inView = event.inView;
        };

        // Private helper functions

        // The search results created within the window, matching the
        // timeline's server-side created_within: calendar months and years,
        // counted back from now.
        _filteredPins() {
            if (!this.postedWithin) {
                return this._searchPins;
            }
            const since = this.postedSpan.offsetDate(new Date(), this.postedWithin, -1);
            return this._searchPins.filter(pin => new Date(pin.utcCreatedDateTime) >= since);
        }

        _resolveTodayMarker() {
            this._todayMarker = this.mainUtilService.resolveTodayMarker(this.bags, this._todayMarker);
            return this._todayMarker;
        }

        // Rebuilds the bags and, like the timeline, opens them on today -
        // results, and every change of the posted-within window over them.
        _setSearchPinGroups(pins) {
            this.pinApp.clearSearchBags();
            this.pinApp.mergeSearchBagsWithPins(pins);
            this.bags = this.pinApp.getSearchBags();
            this.$timeout(() => {
                this.mainUtilService.scrollAdjust(this.scrollToIDAsync, this.bags, this.getHomeScrollId());
            });
        }


    }

    angular.module('chronopinNodeApp')
        .component('search', {
            templateUrl: 'app/search/search.html',
            controller: SearchController
        });
})();
