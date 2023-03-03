'use strict';

(function() {
  const delayParse = 0;

  angular.module('chronopinNodeApp.twitter')
    .directive('twitterPin', function(twitterJs, $timeout) {

      function createHTML(html) {
        return (`
          <div class="twitter-pin-container" ng-switch-when="2"
            data-actual-width="250" data-actual-height="496">
            ${html}
          </div>
          `)
      }

      return {
        restrict: 'AE',
        scope: {},
        link: function postLink(scope, elem, attrs) {
          attrs.$observe('html', function(newValue) {
            let html = newValue;

            if (html) {
              twitterJs.initalized
                .then(twttr => {
                  let $twitterEl = $(createHTML(html));
                  elem.append($twitterEl);

                  $timeout(() => {
                    twttr.widgets.load(elem);
                  }, delayParse);

                });
            }

          });
        }
      };
    });

})();
