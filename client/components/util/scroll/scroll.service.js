'use strict';

(function () {

    /**
     * The Util service is for thin, globally reusable, utility functions
     */

    const menuOffset = 52;
    let resolveInitialized;
    let initialized = new Promise((resolve, reject) => {
        resolveInitialized = resolve;
    });

    function ScrollUtil() {

        const ScrollUtil = {

            getDocument() {
                return document;
            },

            getScrollEl() {
                return document.documentElement;
            },

            setInitialized(value) {
                resolveInitialized(value);
            },

            // Pure Function
            getScrollHeight(scrollEl) {
                return scrollEl.scrollHeight;
            },

            getElementById(id) {
                return document.getElementById(id);
            },

            // Impure Function
            scrollYTo(scrollEl, y) {
                scrollEl.scrollTop = y;
                return this;
            },

            scrollToID(scrollEl, id) {
                const pos = ScrollUtil.findYPos(ScrollUtil.getElementById(id));
                return ScrollUtil.scrollYTo(scrollEl, pos);
            },

            scrollToIDAsync(scrollEl, id) {
                return initialized.then(t => {
                    return ScrollUtil.scrollToID(scrollEl, id);
                });
            },

            findYPos(el) {
                let curtop = 0,
                    originalEl = el;
                if (el && el.offsetParent) {
                    do {
                        curtop += el.offsetTop;
                    } while (!!(el = el.offsetParent));
                    return curtop - menuOffset - 5 - Number.parseInt(this.findComputedStyle(originalEl, 'margin-top')); // add height of navbar main and additional 5px add to config and element margin
                }
            },

            findComputedStyle(el, styleName) {
                /***
                 * get live runtime value of an element's css style
                 *   http://robertnyman.com/2006/04/24/get-the-rendered-style-of-an-element
                 *     note: "styleName" is in CSS form (i.e. 'font-size', not 'fontSize').
                 ***/
                let styleValue = "";
                if (document.defaultView && document.defaultView.getComputedStyle) {
                    styleValue = document.defaultView.getComputedStyle(el).getPropertyValue(styleName);
                }
                else if (el.currentStyle) {
                    styleName = styleName.replace(/\-(\w)/g, function (strMatch, p1) {
                        return p1.toUpperCase();
                    });
                    styleValue = el.currentStyle[styleName];
                }
                return styleValue;
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
            },

            adjustScrollRelativeToCurrentView(scrollEl, relEl) {
                const scrollYToFn = ScrollUtil.scrollYTo.bind(null, scrollEl);
                const boundingClientRectBefore = relEl.getBoundingClientRect();
                const scrollHeightBefore = ScrollUtil.captureYOffset(scrollEl);
                // no digest necessary
                setTimeout(() => {
                    const boundingClientRectAfter = relEl.getBoundingClientRect(),
                        scrollHeightPos = scrollHeightBefore + boundingClientRectAfter.top - boundingClientRectBefore.top;
                    scrollYToFn(scrollHeightPos);
                }, 0);
            },

            isOverflown({ clientHeight, scrollHeight }) {
                return scrollHeight > clientHeight;
            },

            scrollHeightLessOne({ scrollHeight }) {
                return scrollHeight - 1;
            },

            addEventListener(type, handler, capture) {
                let scope = this.getDocument();
                scope.addEventListener(type, handler, capture);
                return () => {
                    scope.removeEventListener(type, handler, capture);
                }
            }

        };

        return ScrollUtil;

    }

    angular.module('chronopinNodeApp.util')
        .factory('ScrollUtil', ScrollUtil);
})();
