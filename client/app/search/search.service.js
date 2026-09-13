'use strict';

(function () {

    // Straight and smart double quotes - never part of a name, so they are
    // stripped from label values and treated alike when reading a query.
    const DOUBLE_QUOTES = /["\u201C\u201D\u201E\u201F\u2033]/g;

    // Smart single quotes, read as a plain ' - which is both a quote and an
    // apostrophe, so unlike double quotes it is never stripped from a name.
    const SMART_SINGLE_QUOTES = /[\u2018\u2019\u201A\u201B\u2032]/g;

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

        // What a pin card's user, company and category labels call. Adds the
        // label's term to the search already showing rather than replacing
        // it, so each click narrows (or, for a second company, widens) the
        // results. Anywhere but the search page it starts a fresh search.
        // A term already in the query is not added twice.
        refine(field, value) {
            const cleaned = String(value || '').replace(DOUBLE_QUOTES, '').trim();
            if (!cleaned) {
                return this;
            }
            const current = this.$state.is('search') ? (this.$state.params.q || '').trim() : '';
            if (SearchService.hasTerm(current, field, cleaned)) {
                return this.submit(current);
            }
            return this.submit(`${current} ${SearchService.term(field, cleaned)}`.trim());
        }

        // A value with spaces is quoted, matching what the server parses:
        // company:"Electronic Arts". Double quotes, since a single quote can
        // be an apostrophe inside the name.
        static term(field, value) {
            const name = SearchService.termValue(field, value);
            return /\s/.test(name) ? `${field}:"${name}"` : `${field}:${name}`;
        }

        // User names are stored with a leading "@", which user: leaves out -
        // user:ThePinGang, like category:Software.
        static termValue(field, value) {
            return field === 'user' ? value.replace(/^@+/, '') : value;
        }

        // Whether the query already holds this term in any of the forms the
        // server accepts - bare, value quoted or whole term quoted, with
        // either kind of quote, any letter case - so a click never adds a
        // second copy of something typed by hand.
        static hasTerm(query, field, value) {
            const normalized = ` ${query
                .replace(DOUBLE_QUOTES, '"')
                .replace(SMART_SINGLE_QUOTES, "'")
                .toLowerCase()} `;
            const lower = SearchService.termValue(field, value).toLowerCase();
            // A user can also be written user:@name, or as a bare @name.
            const values = field === 'user' ? [lower, `@${lower}`] : [lower];
            const forms = values.reduce((all, v) => all.concat(
                ['"', "'"].reduce((quoted, quote) => quoted.concat([
                    `${field}:${quote}${v}${quote}`,
                    `${quote}${field}:${v}${quote}`
                ]), [`${field}:${v}`])
            ), field === 'user' ? [`@${lower}`] : []);
            return forms.some(form => normalized.indexOf(` ${form} `) !== -1);
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
