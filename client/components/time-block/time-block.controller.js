/*jshint unused:false*/
'use strict';

(function () {

    class TimeBlockController {

        constructor($scope) {
        }

        $onInit() {
            //this._registerWaypointObserver(); /////////////////////
            //debugger
        }

    }

    angular.module('chronopinNodeApp')
        .component('timeBlock', {
            templateUrl: 'components/time-block/time-block.html',
            controller: TimeBlockController,
            bindings: {
                bag: '<',
                config: '<'
            }
        });
})();
