/*jshint unused:false*/
'use strict';

(function () {

    class TimeBlockController {

        constructor($scope) {
        }

        $onInit() {
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

<div class="timeline__date --1">
    <span class="timeline__tag" ng-bind="$ctrl.bag.utcStartDateTime | date:'MM/dd/yyyy'"></span>
</div>
<div class="timeline__countdown --2" ng-class="{'timeline__countdown--today': $ctrl.bag.getDateSince() === 0}" title="{{$ctrl.bag.getDateSpan() | timespan}}" id="{{$ctrl.bag.getDateSince()}}">
    <span class="timeline__tag" ng-bind="$ctrl.bag.getDateSpan() | timespan : 'y'"></span>
</div>
<!-- Need to optimize -->
<div class="timeline__trivia" ng-class="'--' + ($index + 3)" uib-tooltip-html="'{{(dt.description || dt.title) | escapeHTML}}'"
    tooltip-trigger="focus" ng-repeat="dt in $ctrl.bag.dateTimes" tooltip-placement="top-left">
    <span class="timeline__tag" ng-bind="dt.title"></span>
</div>

<ul ng-if="!$ctrl.bag.pins.length" class="timeline__group-section --placeholder">
    <li ng-repeat="dtp in $ctrl.bag.dateTimes" class="bag">
        <div class="bag_title" ng-bind="dtp.title"></div>
        <div class="bag_description" ng-bind="dtp.description"></div>
    </li>
</ul>

<!-- Angular Grid -->
<ul ng-if="$ctrl.bag.pins.length" class="timeline__group-section dynamic-grid">
    <li id="{{pin.id}}" class="grid --timeline" data-ng-repeat="pin in $ctrl.bag.pins">

        <pin-block pin="pin" config="$ctrl.config"></pin-block>

    </li>
</ul>
            `
        });
})();
