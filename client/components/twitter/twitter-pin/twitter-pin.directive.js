'use strict';

(function() {
  const delayParse = 0;

  angular.module('chronopinNodeApp.twitter')
    .directive('twitterPin', function(twitterJs, $timeout) {

      function createHTML(html) {
        return (`
          <div class="twitter-pin-container">
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
                  let $el = $(createHTML(html));
                  elem.empty().append($el);

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
