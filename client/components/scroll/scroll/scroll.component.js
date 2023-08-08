/*jshint unused:false*/
'use strict';

(function () {
    class ScrollController {
        constructor(ScrollUtil) {
            this.ScrollUtil = ScrollUtil;
            const scrollEl = ScrollUtil.getScrollEl();
            this.scrollToIDAsync = this.ScrollUtil.scrollToIDAsync.bind(null, scrollEl);
        }

        $onInit() {
        }

        scrollAdjust(elId, offsetPx) {
            if (elId) {
                return this.scrollToIDAsync(elId, offsetPx);
            }
            return Promise.resolve();
        }
    }

    angular.module('chronopinNodeApp')
        .component('scroll', {
            controller: ScrollController,
            controllerAs: 'scroll',
            bindings: {
                scrollToId: '<',
                offsetPx: '<'
            },
            templateUrl: 'components/scroll/scroll/scroll.html',
        });
})();
