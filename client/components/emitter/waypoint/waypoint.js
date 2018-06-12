'use strict';

angular.module('chronopinNodeApp')
    .directive('waypoint', function ($rootScope, $log) {

        const options = {
            // root: document.querySelector('#scrollArea'), // null become browser viewport
            rootMargin: '0px',
            threshold: 0
        }

        function broadcast(eventName, event) {
            $rootScope.$broadcast(eventName, event);
        }

        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                // let offset = parseInt(attrs.threshold) || 0;
                const el = element[0];
                const key = attrs.waypoint;

                const callback = function (entries, observer) {
                    entries.forEach(entry => {
                        // debugger
                        // Each entry describes an intersection change for one observed
                        // target element:
                        //   entry.boundingClientRect
                        //   entry.intersectionRatio
                        //   entry.intersectionRect
                        //   entry.isIntersecting
                        //   entry.rootBounds
                        //   entry.target
                        //   entry.time

                        const emitObj = {
                            key,
                            entry
                        };

                        entry.isIntersecting
                            ? broadcast('waypoint:in', emitObj)
                            : broadcast('waypoint:out', emitObj);

                    });
                };

                const observer = new IntersectionObserver(callback, options);

                observer.observe(el);

            }

        };
    });
