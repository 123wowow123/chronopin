'use strict';

(function () {

    class SearchService {
        constructor($rootScope, $state) {
            this.$rootScope = $rootScope;
            this.$state = $state;
        }

        submit(searchText, searchChoiceText) {
            this.$rootScope.$broadcast('search:submit', {
                searchText,
                searchChoiceText
            });
            return this;
        }

        update(searchText, searchChoiceText) {
            this.$rootScope.$broadcast('search:update', {
                searchText,
                searchChoiceText
            });
            return this;
        }

    }

    angular.module('chronopinNodeApp')
        .service('searchService', SearchService);
})();
