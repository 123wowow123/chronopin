'use strict';

(function () {

    /**
     * The Util service is for thin, globally reusable, utility functions
     */
    function ScrollUtil() {

        const ScrollUtil = {

            // Pure Function
            getScrollHeight(scrollEl) {
                return scrollEl.scrollHeight;
            },

            // Impure Function
            scrollYTo(scrollEl, y) {
                scrollEl.scrollTop = y;
                return this;
            },

            scrollToID(scrollEl, id) {
                let pos = ScrollUtil.findYPos(document.getElementById(id))
                return ScrollUtil.scrollYTo(scrollEl, pos);
            },

            findYPos(el) {
                let curtop = 0;
                if (el.offsetParent) {
                    do {
                        curtop += el.offsetTop;
                    } while (!!(el = el.offsetParent));
                    return curtop - 52 - 5; // add height of navbar main and additional 5px add to config
                }
            },

            captureYOffset(scrollEl) {
                return scrollEl.scrollTop || document.body.scrollTop; // remove body
            },

            adjustScrollAfterPinInsert(scrollEl) {
                const getScrollHeightFn = ScrollUtil.getScrollHeight.bind(null, scrollEl);
                const scrollYToFn = ScrollUtil.scrollYTo.bind(null, scrollEl);
                const scrollHeightBefore = getScrollHeightFn();

                // no digest necessary
                setTimeout(() => {
                    const scrollHeightAfter = getScrollHeightFn(),
                        scrollHeightDelta = scrollHeightAfter - scrollHeightBefore;
                    scrollYToFn(scrollHeightDelta);
                }, 0);
            }
        };

        return ScrollUtil;

    }

    angular.module('chronopinNodeApp.util')
        .factory('ScrollUtil', ScrollUtil);
})();
