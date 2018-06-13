/*jshint unused:false*/
'use strict';

(function () {

    class TimeBlockController {

        constructor($scope) {
        }

        $onInit() {
            //this._registerWaypointObserver(); /////////////////////
        }

        // _registerWaypointObserver() {
        //     const waypointIn = this.$scope.$on('waypoint:in', (event, args) => {
        //         debugger;
        //         this.updateInView({
        //             event,
        //             bag: this.bag
        //         })
        //     });

        //     const waypointOut = this.$scope.$on('waypoint:out', (event, args) => {
        //         debugger;
        //         this.updateInView({
        //             event,
        //             bag: this.bag
        //         })
        //     });

        //     this.registeredListeners['waypoint:in'] = waypointIn;
        //     this.registeredListeners['waypoint:out'] = waypointOut;
        // }

        // _unRegisterWaypointObserver() {
        //     if (this.registeredListeners['waypoint:in']) {
        //         this.registeredListeners['waypoint:in']();
        //         delete this.registeredListeners['waypoint:in'];
        //     }
        //     if (this.registeredListeners['waypoint:out']) {
        //         this.registeredListeners['waypoint:out']();
        //         delete this.registeredListeners['waypoint:out'];
        //     }
        // }
    }

    angular.module('chronopinNodeApp')
        .component('timeBlock', {
            templateUrl: 'components/time-block/time-block.html',
            controller: TimeBlockController,
            //controllerAs: "bag",
            bindings: {
                bag: '<',
                config: '<'
            }
        });
})();
