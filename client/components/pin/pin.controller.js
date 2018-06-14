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
            //templateUrl: 'components/pin/pin.html',
            controller: PinController,
            bindings: {
                pin: '<',
                config: '<'
            },
            template: `
            <article class="grid__panel">
    <p ng-if="$ctrl.isAdmin()">{{$ctrl.pin.searchScore}}</p>
    <div class="headline-above">
        <time class="" datetime="{{$ctrl.pin.utcCreatedDateTime}}">{{$ctrl.pin.utcCreatedDateTime | date : "MM/dd/yyyy 'at' h:mm a" | lowercase}}</time>
        <span class="rubric">{{'the chain gang' | uppercase}}</span>
    </div>
    <h4 class="grid__heading">
        <a class="grid__heading_link" ui-sref="$ctrl.pin({id:$ctrl.pin.id})">
            {{$ctrl.pin.title}}
        </a>
    </h4>
    <a class="grid__asset grid__asset--link" ng-if="$ctrl.pin.media[0].thumbName" ui-sref="$ctrl.pin({id:$ctrl.pin.id})">
        <img ng-src="{{$ctrl.config.thumbUrlPrefix + $ctrl.pin.media[0].thumbName}}" class="grid__image" ng-style="{'height': $ctrl.pin.media[0].thumbHeight + 'px' }"
        />
    </a>
    <div class="grid__body">
        <div class="grid__uploaded-date" ng-switch="$ctrl.pin.allDay">
            <span ng-switch-when="true">
                <!-- <em>All Day</em> -->
            </span>
            <em ng-switch-default>
                <span>Start: {{$ctrl.pin.utcStartDateTime | date:"MM/dd/yyyy h:mma"}}</span>
                <span ng-if="$ctrl.pin.utcEndDateTime">to {{$ctrl.pin.utcEndDateTime | date:"MM/dd/yyyy h:mma"}}</span>
            </em>
        </div>
        <div class="grid__description">
            {{$ctrl.pin.description}}
        </div>
        <div class="grid__footer">
            <div class="grid__price" ng-class="{'grid__price--negative': $ctrl.pin.price < 0}" ng-if="$ctrl.pin.price">{{$ctrl.pin.price | money}}</div>

            <div class="grid__social">
                <div class="grid__tip" ng-if="$ctrl.isAdmin()">
                    <button class="btn btn-link" ui-sref="main.modalScroller.editPin({id:$ctrl.pin.id})">
                        <i class="fa fa-pencil" aria-hidden="true"></i>
                    </button>
                </div>

                <div class="grid__watch" ng-switch="!!$ctrl.pin.hasFavorite">
                    <button type="button" class="grid__favorite--add" ng-click="$ctrl.addFavorite($ctrl.pin)" ng-switch-default>
                        <i class="fa fa-eye" aria-hidden="true"></i> {{$ctrl.pin.favoriteCount}}</button>
                    <button type="button" class="grid__favorite--remove" ng-click="$ctrl.removeFavorite($ctrl.pin)" ng-switch-when="true">
                        <i class="fa fa-eye" aria-hidden="true"></i> {{$ctrl.pin.favoriteCount}}</button>
                </div>

                <div class="grid__likes">
                    <div fb-like page-href="{{$ctrl.pin.sourceUrl}}">
                        <loader-pulse-bubble></loader-pulse-bubble>
                    </div>
                    <!-- <button type="button" class="grid__like--add" ng-click="$ctrl.addLike($ctrl.pin)" ng-switch-default><i class="fa fa-thumbs-o-up" aria-hidden="true"></i></button>
          <button type="button" class="grid__like--remove" ng-click="$ctrl.removeLike($ctrl.pin)" ng-switch-when="true"><i class="fa fa-thumbs-o-up" aria-hidden="true"></i></button> {{$ctrl.pin.likeCount}} -->
                </div>

                <!-- <div class="tip pull-right">
          <button type="button" class="btn btn-link" ng-click="$ctrl.info($ctrl.pin)"><i class="fa fa-info" aria-hidden="true" title="{{$ctrl.pin.tip}}"></i></button>
        </div> -->

            </div>
        </div>
    </div>
</article>
            `
        });
})();
