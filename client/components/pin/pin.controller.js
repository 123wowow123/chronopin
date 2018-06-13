/*jshint unused:false*/
'use strict';

(function () {

    class PinController {

        constructor($scope) {
        }

        $onInit() {
            //this._registerWaypointObserver(); /////////////////////
            //debugger
        }
    }

    angular.module('chronopinNodeApp')
        .component('pinBlock', {
            templateUrl: 'components/pin/pin.html',
            controller: PinController,
            bindings: {
                pin: '<',
                config: '<'
            }
        });
})();
