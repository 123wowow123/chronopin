/*jshint unused:false*/
'use strict';

(function () {

    class TimeBlockController {

        constructor($scope, specialtyDay) {
            this.specialtyDay = specialtyDay;
            this.specialtyDays = [];
        }

        $onInit() {
            //this._registerWaypointObserver(); /////////////////////
            //debugger

        }

        // Every date carries its specialty-day tag under the rest of its tags.
        // The bag's start is the local midnight of the day its date tag shows.
        $onChanges(changes) {
            if (!changes.bag) {
                return;
            }
            const bag = this.bag;
            this.specialtyDays = [];
            if (bag) {
                this.specialtyDay.namesOn(bag.utcStartDateTime).then(names => {
                    if (this.bag === bag) {
                        this.specialtyDays = names;
                    }
                });
            }
        }

    }

    angular.module('chronopinNodeApp')
        .component('timeBlock', {
            // templateUrl throws render timing off and causes issues with infinite scroll
            // templateUrl: 'components/time-block/time-block.html',
            controller: TimeBlockController,
            bindings: {
                bag: '<',
                config: '<'
            },
            template:
                `
            <!-- Add class: measure -->
<div class="timeline__circle" uib-tooltip-html="'{{$ctrl.bag.utcStartDateTime | astroweek:'EEEE'}}'" tooltip-trigger="focus">
    <i class="astro" ng-class="'astro-' + ($ctrl.bag.utcStartDateTime | date:'EEE' | lowercase)"></i>
</div>

<div class="timeline__date --1" ng-class="{'timeline__date--today': $ctrl.bag.getDateSince() === 0}">
    <span class="timeline__tag" ng-bind="$ctrl.bag.utcStartDateTime | date:'MM/dd/yyyy'"></span>
</div>
<div class="timeline__countdown --2" ng-class="{'timeline__countdown--today': $ctrl.bag.getDateSince() === 0}" title="{{$ctrl.bag.getDateSpan() | timespan}}">
    <span class="timeline__tag" ng-bind="$ctrl.bag.getDateSpan() | timespan : 'y'"></span>
</div>
<!-- Need to optimize -->
<div class="timeline__trivia" ng-class="'--' + ($index + 3)" uib-tooltip-html="'{{(dt.description || dt.title) | escapeHTML}}'"
    tooltip-trigger="focus" ng-repeat="dt in $ctrl.bag.dateTimes" tooltip-placement="top-left">
    <span class="timeline__tag" ng-bind="dt.title"></span>
</div>
<!-- After the trivia so this taller, wider tag ends the stack in both layouts. -->
<div class="timeline__trivia timeline__specialty" ng-class="'--' + ($ctrl.bag.dateTimes.length + 3)" ng-if="$ctrl.specialtyDays.length"
    title="{{$ctrl.specialtyDays.join('\\n')}}">
    <span class="timeline__tag" ng-bind="$ctrl.specialtyDays[0]"></span>
</div>

<ul ng-if="!$ctrl.bag.pins.length" class="timeline__group-section --placeholder"
    ng-class="$ctrl.specialtyDays.length ? '--specialty-' + ($ctrl.bag.dateTimes.length + 3) : ''">
    <li ng-repeat="dtp in $ctrl.bag.dateTimes" class="bag">
        <div class="bag_title" ng-bind="dtp.title"></div>
        <div class="bag_description" ng-bind="dtp.description"></div>
    </li>
</ul>

<!-- Angular Grid -->
<ul ng-if="$ctrl.bag.pins.length" class="timeline__group-section dynamic-grid">
    <li id="{{pin.id}}" class="grid --timeline" pin-tilt data-ng-repeat="pin in $ctrl.bag.pins">

        <pin-block pin="pin" config="$ctrl.config"></pin-block>

    </li>
</ul>
            `
        });
})();
