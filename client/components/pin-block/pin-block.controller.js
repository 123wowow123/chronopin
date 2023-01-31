/*jshint unused:false*/
'use strict';

(function () {

    class PinBlockController {

        constructor($scope, pinWebService, Auth) {
            this.pinWebService = pinWebService;
            this.Auth = Auth;
        }

        $onInit() {
            //this._registerWaypointObserver(); /////////////////////
            //debugger

            //youtube
            //https://www.geeksforgeeks.org/how-to-get-youtube-video-id-with-php-regex/
            //get embed code
            // GET https://www.googleapis.com/youtube/v3/videos?part=player&id={VIDEO_ID}&maxResults=1&key={YOUR_API_KEY}
            //https://stackoverflow.com/questions/21476121/generate-youtube-videos-embed-code-using-its-url
            //document.body.appendChild(document.createElement('div')).innerHTML=yt('yturl')

            // twitter
            //https://developer.twitter.com/en/docs/twitter-for-websites/embedded-tweets/overview.html
            //https://publish.twitter.com/oembed?url=https://twitter.com/Interior/status/463440424141459456 (Convert Tweet URLs using oEmbed)
            $.getScript('//platform.twitter.com/widgets.js', () => {
                twttr.widgets.load(document.body)
            });


            // this.html = `
            // \u003Cblockquote class=\"twitter-tweet\"\u003E\u003Cp lang=\"en\" dir=\"ltr\"\u003ESunsets don&#39;t get much better than this one over \u003Ca href=\"https:\/\/twitter.com\/GrandTetonNPS?ref_src=twsrc%5Etfw\"\u003E@GrandTetonNPS\u003C\/a\u003E. \u003Ca href=\"https:\/\/twitter.com\/hashtag\/nature?src=hash&amp;ref_src=twsrc%5Etfw\"\u003E#nature\u003C\/a\u003E \u003Ca href=\"https:\/\/twitter.com\/hashtag\/sunset?src=hash&amp;ref_src=twsrc%5Etfw\"\u003E#sunset\u003C\/a\u003E \u003Ca href=\"http:\/\/t.co\/YuKy2rcjyU\"\u003Epic.twitter.com\/YuKy2rcjyU\u003C\/a\u003E\u003C\/p\u003E&mdash; US Department of the Interior (@Interior) \u003Ca href=\"https:\/\/twitter.com\/Interior\/status\/463440424141459456?ref_src=twsrc%5Etfw\"\u003EMay 5, 2014\u003C\/a\u003E\u003C\/blockquote\u003E\n\u003Cscript async src=\"https:\/\/platform.twitter.com\/widgets.js\" charset=\"utf-8\"\u003E\u003C\/script\u003E\n
            // `

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

    }

    angular.module('chronopinNodeApp')
        .component('pinBlock', {
            controller: PinBlockController,
            bindings: {
                pin: '<',
                config: '<'
            },
            // templateUrl throws render timing off and causes issues with infinite scroll
            templateUrl: 'components/pin-block/pin-block.html',
            //     template: `
            //     <article class="grid__panel">
            //     <!-- <p ng-if="$ctrl.Auth.isAdmin()">{{$ctrl.pin.searchScore}}</p> -->
            //     <div class="headline-above">
            //         <time class="" datetime="{{$ctrl.pin.utcCreatedDateTime}}">{{$ctrl.pin.utcCreatedDateTime | date : "MM/dd/yyyy 'at' h:mm a" | lowercase}}</time>
            //         <span class="rubric">{{'the chain gang' | uppercase}}</span>
            //     </div>
            //     <h4 class="grid__heading">
            //         <a class="grid__heading_link" ui-sref="pin({id:$ctrl.pin.id})">
            //             {{$ctrl.pin.title}}
            //         </a>
            //     </h4>
            //     <a class="grid__asset grid__asset--link" ng-if="$ctrl.pin.media[0].thumbName" ui-sref="pin({id:$ctrl.pin.id})">
            //         <img ng-src="{{$ctrl.config.thumbUrlPrefix + $ctrl.pin.media[0].thumbName}}" class="grid__image" ng-style="{'height': ($ctrl.pin.media[0].thumbHeight * 0.757188498) + 'px' }"
            //         />
            //     </a>
            //     <div class="grid__body">
            //         <div class="grid__uploaded-date" ng-switch="$ctrl.pin.allDay">
            //             <span ng-switch-when="true">
            //                 <!-- <em>All Day</em> -->
            //             </span>
            //             <em ng-switch-default>
            //                 <span>Start: {{$ctrl.pin.utcStartDateTime | date:"MM/dd/yyyy h:mma"}}</span>
            //                 <span ng-if="$ctrl.pin.utcEndDateTime">to {{$ctrl.pin.utcEndDateTime | date:"MM/dd/yyyy h:mma"}}</span>
            //             </em>
            //         </div>
            //         <div class="grid__description">
            //             {{$ctrl.pin.description}}
            //         </div>
            //         <div class="grid__footer">
            //             <div class="grid__price" ng-class="{'grid__price--negative': $ctrl.pin.price < 0}" ng-if="$ctrl.pin.price">{{$ctrl.pin.price | money}}</div>

            //             <div class="grid__social">
            //                 <div class="grid__tip" ng-if="$ctrl.isAdmin()">
            //                     <button class="btn btn-link" ui-sref="main.modalScroller.editPin({id:$ctrl.pin.id})">
            //                         <i class="fa fa-pencil" aria-hidden="true"></i>
            //                     </button>
            //                 </div>

            //                 <div class="grid__watch" ng-switch="!!$ctrl.pin.hasFavorite">
            //                     <button type="button" class="grid__favorite--add" ng-click="$ctrl.addFavorite($ctrl.pin)" ng-switch-default>
            //                         <i class="fa fa-eye" aria-hidden="true"></i> {{$ctrl.pin.favoriteCount}}</button>
            //                     <button type="button" class="grid__favorite--remove" ng-click="$ctrl.removeFavorite($ctrl.pin)" ng-switch-when="true">
            //                         <i class="fa fa-eye" aria-hidden="true"></i> {{$ctrl.pin.favoriteCount}}</button>
            //                 </div>

            //                 <div class="grid__likes">
            //                     <div fb-like page-href="{{$ctrl.pin.sourceUrl}}">
            //                         <loader-pulse-bubble></loader-pulse-bubble>
            //                     </div>
            //                     <!-- <button type="button" class="grid__like--add" ng-click="$ctrl.addLike($ctrl.pin)" ng-switch-default><i class="fa fa-thumbs-o-up" aria-hidden="true"></i></button>
            //               <button type="button" class="grid__like--remove" ng-click="$ctrl.removeLike($ctrl.pin)" ng-switch-when="true"><i class="fa fa-thumbs-o-up" aria-hidden="true"></i></button> {{$ctrl.pin.likeCount}} -->
            //                 </div>

            //                 <!-- <div class="tip pull-right">
            //               <button type="button" class="btn btn-link" ng-click="$ctrl.info($ctrl.pin)"><i class="fa fa-info" aria-hidden="true" title="{{$ctrl.pin.tip}}"></i></button>
            //             </div> -->

            //             </div>
            //         </div>
            //     </div>
            // </article>
            //     `
        });
})();
