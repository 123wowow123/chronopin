/*jshint unused:false*/
'use strict';

(function () {

    class PinBlockController {

        constructor($scope, $element, $attrs, pinWebService, Auth, ScrollUtil, Util, searchService) {
            this.pinWebService = pinWebService;
            this.Auth = Auth;
            this.Util = Util;
            this.ScrollUtil = ScrollUtil;
            this.searchService = searchService;
            this.$element = $element;
            this.disableLink = $attrs.hasOwnProperty('disabled');
        }

        $onInit() {
            //this._registerWaypointObserver(); /////////////////////
            this.ScrollUtil.setInitialized(true);
        }

        // Click handlers

        addLike(pin) {
            const id = pin.id;
            if (id) {
                pin.hasLike = true;
                return this.pinWebService.like(id)
                    .then(res => {
                        //pin.likeCount = res.data.likeCount;
                    })
                    .catch(err => {
                        pin.hasLike = false;
                        throw err;
                    });
            }
        }

        removeLike(pin) {
            const id = pin.id;
            if (id) {
                pin.hasLike = false;
                return this.pinWebService.unlike(id)
                    .then(res => {
                        //pin.likeCount = res.data.likeCount;
                    })
                    .catch(err => {
                        pin.hasLike = false;
                        throw err;
                    });
            }
        }

        addFavorite(pin) {
            const id = pin.id;
            if (id) {
                pin.hasFavorite = true;
                return this.pinWebService.favorite(id)
                    .then(res => {
                        //pin.favoriteCount = res.data.favoriteCount; //need to get value from server due to concurrency issue
                    })
                    .catch(err => {
                        pin.hasFavorite = false;
                    });
            }
        }

        removeFavorite(pin) {
            const id = pin.id;
            if (id) {
                pin.hasFavorite = false;
                return this.pinWebService.unfavorite(id)
                    .then(res => {
                        //pin.favoriteCount = res.data.favoriteCount; //need to get value from server due to concurrency issue
                    })
                    .catch(err => {
                        pin.hasFavorite = false;
                        throw err;
                    });
            }
        }

        isContentOverflown(contentEl) {
            return this.ScrollUtil.isOverflown(contentEl);
        }

        scrollHeightLessOne(contentEl) {
            return this.activateFullPin && this.fullPin ? { 'max-height': this.ScrollUtil.scrollHeightLessOne(contentEl) + 'px' } : {};
        }

        getMediaSource(pin) {
            const firstMedia = _.get(pin, 'media[0]');
            return firstMedia.thumbName ? (this.config.thumbUrlPrefix + firstMedia.thumbName) : firstMedia.originalUrl;
        }

        pinComputedImageWidth(pin) {
            return this.width + 'px';
        }

        pinComputedImageHeight(pin) {
            const imageOriginalWidth = this._pinImageWidth(pin);
            const imageOriginalHeight = this._pinImageHeight(pin);
            const height = this.width / (imageOriginalWidth / imageOriginalHeight);
            return height + 'px';
        }

        _pinImageWidth(pin) {
            const thumbWidth = _.get(pin, 'media[0].thumbWidth');
            // if (!thumbWidth) {
            //     console.log('thumbWidth', pin.id);
            // }
            return thumbWidth;
        }

        _pinImageHeight(pin) {
            const thumbHeight = _.get(pin, 'media[0].thumbHeight');
            // if (!thumbHeight) {
            //     console.log('thumbHeight', pin.id);
            // }
            return thumbHeight;
        }

        $postLink() {
            this.contentEl = this.$element[0].querySelector('.grid__content');
            this.width = this.contentEl.offsetWidth;
        };

    }

    angular.module('chronopinNodeApp')
        .component('pinBlock', {
            controller: PinBlockController,
            // link: (scope, elem, attrs) => {
            //     scope.contentEl = elem.find('grid__content');
            // },
            bindings: {
                pin: '<',
                config: '<',
                fullPin: '<',
                activateFullPin: '=',
                disabled: '=',
                showMoreFn: "&",
            },
            // templateUrl throws render timing off and causes issues with infinite scroll
            //templateUrl: 'components/pin-block/pin-block.html',
            template: `
            <article class="grid__panel" ng-class="{ '\--disabled': $ctrl.disableLink }">
            <!-- <p ng-if="$ctrl.Auth.isAdmin()">{{$ctrl.pin.searchScore}}</p> -->
            <div class="grid__content" ng-style="$ctrl.scrollHeightLessOne($ctrl.contentEl)">
                <div class="grid__headline">
                    <div class="headline-left">
                        <a class="posted-time" ui-sref="pin({id:$ctrl.pin.id})"
                            ng-attr-aria-label="Read more about {{$ctrl.pin.title}}">
                            <time datetime="{{$ctrl.pin.utcCreatedDateTime}}">{{$ctrl.pin.utcCreatedDateTime | date :
                                "MM/dd/yyyy
                                'at' h:mm a" | lowercase}}
                            </time>
                        </a>
                        <span class="rubric__divider">/</span>
                        <a ng-href="/search?q={{$ctrl.pin.user.userName}}" class="rubric"
                            ng-attr-aria-label="Read more pins posted from or containing user {{$ctrl.pin.user.userName}}">
                            <span>{{$ctrl.pin.user.userName}}</span>
                        </a>
                    </div>
        
                    <div class="icon_set">
                        <a ui-sref="pin({id:$ctrl.pin.id})" ng-if="!!$ctrl.pin.parentId || !!$ctrl.pin.rootThread"
                            ng-attr-aria-label="Read more about {{$ctrl.pin.title}}">
                            <span class="thread-icon" ng-if="!!$ctrl.pin.parentId" title="Part of thread"></span>
                            <span class="thread-icon" ng-if="!!$ctrl.pin.rootThread" title="Firt Pin in a thread"></span>
                        </a>
                        <a ui-sref="pin({id:$ctrl.pin.id})" ng-if="$ctrl.Util.hasAddress($ctrl.pin)"
                            ng-attr-aria-label="See the following locations of this pin on a map: {{$ctrl.Util.getListOfAddress($ctrl.pin)}}">
                            <i class="fa fa-map-marker" aria-hidden="true"></i>
                        </a>
                    </div>
                </div>
        
                <h1 class="grid__heading">
                    <a class="grid__heading_link" ui-sref="pin({id:$ctrl.pin.id})">
                        {{$ctrl.pin.title}}
                    </a>
                </h1>
        
                <!-- Switch between image / iframe / tweets -->
                <div class="grid__media" ng-switch="$ctrl.pin.media[0].type">
        
                    <div ng-switch-when="1">
                        <a class="grid__asset grid__asset--link"
                            ng-if="$ctrl.getMediaSource($ctrl.pin)"
                            ui-sref="pin({id:$ctrl.pin.id})" ng-attr-aria-label="Read more about {{$ctrl.pin.title}}">
                            <img ng-src="{{$ctrl.getMediaSource($ctrl.pin)}}" class="grid__image" loading="lazy"
                                height="{{$ctrl.pinComputedImageHeight($ctrl.pin)}}" width="{{$ctrl.pinComputedImageWidth($ctrl.pin)}}" />
                        </a>
                    </div>
        
                    <twitter-pin ng-switch-when="2" html="{{$ctrl.pin.media[0].html}}">
                    </twitter-pin>
        
                    <div class='embed-container' ng-switch-when="3" ng-bind-html="$ctrl.pin.media[0].html">
                    </div>
        
                </div>
        
                <div class="grid__body">
                    <!-- <div class="grid__uploaded-date" ng-switch="$ctrl.pin.allDay">
                        <span ng-switch-when="true">
                            <em>All day</em>
                        </span>
                        <em ng-switch-default>
                            <span>Start: {{$ctrl.pin.utcStartDateTime | date:"MM/dd/yyyy h:mma"}}</span>
                            <span ng-if="$ctrl.pin.utcEndDateTime">to {{$ctrl.pin.utcEndDateTime | date:"MM/dd/yyyy
                                h:mma"}}</span>
                        </em>
                    </div> -->
                    <div class="grid__description" ng-bind-html="$ctrl.pin.description"></div>
                </div>
        
                <a class="grid__show_more" ui-sref="pin({id:$ctrl.pin.id})"
                    ng-if="!$ctrl.activateFullPin && $ctrl.isContentOverflown($ctrl.contentEl)">
                    show more
                </a>
        
                <span class="grid__show_more" ng-click="$ctrl.showMoreFn()"
                    ng-if="$ctrl.activateFullPin && $ctrl.isContentOverflown($ctrl.contentEl)">
                    {{$ctrl.fullPin ? 'show less' : 'show more'}}
                </span>
        
            </div>
        
            <div class="grid__footer">
                <div class="grid__price" ng-class="{'grid__price--negative': $ctrl.pin.price < 0}">
                    <span ng-if="$ctrl.pin.price">{{$ctrl.pin.price | money}}</span>
                </div>
        
                <div class="grid__social">
                    <div class="grid__tip" ng-if="$ctrl.isAdmin()">
                        <button class="btn btn-link" ui-sref="main.modalScroller.editPin({id:$ctrl.pin.id})">
                            <i class="fa fa-pencil" aria-hidden="true"></i>
                        </button>
                    </div>
        
                    <div class="grid__comment_count">
                        <comment-count comment-url="{{'/pin/'+$ctrl.pin.id}}"></comment-count>
                    </div>
        
                    <div class="grid__watch" ng-switch="!!$ctrl.pin.hasFavorite">
                        <button type="button" class="grid__favorite --add" title="Add to watch"
                            ng-click="!$ctrl.disableLink && $ctrl.addFavorite($ctrl.pin)" ng-switch-default>
                            <i class="fa fa-eye" aria-hidden="true"></i> {{$ctrl.pin.favoriteCount}}</button>
                        <button type="button" class="grid__favorite --remove" title="Remove from watch"
                            ng-click="!$ctrl.disableLink && $ctrl.removeFavorite($ctrl.pin)" ng-switch-when="true">
                            <i class="fa fa-eye" aria-hidden="true"></i> {{$ctrl.pin.favoriteCount}}</button>
                    </div>
        
                    <div class="grid__watch" ng-switch="!!$ctrl.pin.hasLike">
                        <!-- <div fb-like page-href="{{$ctrl.pin.sourceUrl}}">
                            <loader-pulse-bubble></loader-pulse-bubble>
                        </div> -->
                        <button type="button" class="grid__favorite --add" title="Like Pin"
                            ng-click="!$ctrl.disableLink && $ctrl.addLike($ctrl.pin)" ng-switch-default>
                            <i class="fa fa-thumbs-o-up" aria-hidden="true"></i> {{$ctrl.pin.likeCount}}</button>
                        <button type="button" class="grid__favorite --remove" title="Remove Like Pin"
                            ng-click="!$ctrl.disableLink && $ctrl.removeLike($ctrl.pin)" ng-switch-when="true">
                            <i class="fa fa-thumbs-o-up" aria-hidden="true"></i> {{$ctrl.pin.likeCount}}</button>
        
                    </div>
        
                    <!-- <div class="tip pull-right">
                  <button type="button" class="btn btn-link" ng-click="$ctrl.info($ctrl.pin)"><i class="fa fa-info" aria-hidden="true" title="{{$ctrl.pin.tip}}"></i></button>
                </div> -->
        
                </div>
            </div>
        
        </article>
                `
        });
})();
