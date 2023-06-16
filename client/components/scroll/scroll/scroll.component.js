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

        scrollAdjust(elId) {
            if (!this.scrollToPinMode) {
                if (elId) {
                    return this.scrollToIDAsync(elId);
                }
            } else {
                // To Do Add scroll to pin and not timeline location
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
                scrollToPinMode: '<'
            },
            templateUrl: 'components/scroll/scroll/scroll.html',
        });
})();
