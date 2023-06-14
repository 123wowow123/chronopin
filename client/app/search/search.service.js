'use strict';

(function () {

    class SearchService {
        constructor($rootScope, $state, $transitions, Auth, appConfig) {
            this.lastNotification;
            this.appConfig = appConfig;
            this.$rootScope = $rootScope;
            this.$state = $state;
            this.locationService = $state.router.locationService;
            this.Auth = Auth;

            const extractedQuery = this._extractQuery(this.locationService);
            if (extractedQuery.path == "/search") {
                this.lastNotification = extractedQuery;
                this.notifySearch(
                    extractedQuery.searchText,
                    extractedQuery.searchChoiceText
                );
            }

            // todo: if route is search and submit
            $transitions.onSuccess({ exiting: 'search' }, (transition) => {
                this.lastNotification = undefined;
                this.notifySearch(
                    undefined,
                    undefined
                );
            });

            $transitions.onSuccess({ entering: 'search' }, (transition) => {
                const extractedQuery = this._extractQuery(this.locationService);
                this.lastNotification = extractedQuery;
                this.notifySearch(
                    extractedQuery.searchText,
                    extractedQuery.searchChoiceText
                );
            });

        }

        _extractQuery(locationService) {
            const hashTag = this.appConfig.searchPrefix.hashTag;
            const path = locationService.path();
            const args = locationService.search();
            const hashValue = locationService.hash()
            const q = args.q;
            const searchChoiceText = args.f;
            const searchText = (q || '') + (hashValue ? `${hashTag}${hashValue}` : '');
            return {
                path,
                searchText,
                searchChoiceText
            };
        }

        notifySearch(searchText, searchChoiceText) {
            this.$rootScope.$broadcast('search:submit', {
                searchText,
                searchChoiceText
            });
        }

        goSearch(searchText, searchChoiceText) {
            if (!searchText && !searchChoiceText) {
                return this.goToMain();
            } else if (searchChoiceText === 'mine') {
                let userName = this.Auth.getCurrentUserName();
                searchText = `${userName}`;
                searchChoiceText = undefined;
            }
            this.$state.go('search', { q: searchText, f: searchChoiceText });
            return this;
        }

        goToMain() {
            this.$state.go('main');
            return this;
        }
    }

    angular.module('chronopinNodeApp')
        .service('searchService', SearchService);
})();
