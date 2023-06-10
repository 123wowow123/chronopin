'use strict';

(function () {
  const delayParse = 0;

  angular.module('chronopinNodeApp.twitter')
    .directive('twitterPin', function (twitterJs, $timeout) {

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
          attrs.$observe('html', function (newValue) {
            let html = newValue;
            let $el = $(createHTML(html));
            elem.empty().append($el);
            twitterJs.initalized
              .then(twttr => {
                $timeout(() => {
                  twttr.widgets.load(elem);
                }, delayParse);

              });
          });
        }
      };
    });

})();
