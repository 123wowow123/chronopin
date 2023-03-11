'use strict';

(function () {
  const delayParse = 0;

  angular.module('chronopinNodeApp.comment')
    .directive('commentPost', function (commentJs, $timeout) {

      function createHTML(commentUrl) {
        return (`
          <section id="isso-thread" data-isso-id="${commentUrl}">
            <noscript>Javascript needs to be activated to view comments.</noscript>
          </section>
          `)
      }

      return {
        restrict: 'AE',
        scope: {},
        link: function postLink(scope, elem, attrs) {
          attrs.$observe('commentUrl', function (newValue) {
            let commentUrl = newValue;

            if (commentUrl) {
              commentJs.initalized
                .then(isso => {
                  let $el = $(createHTML(commentUrl));
                  elem.empty().append($el);
                });
            }

          });
        }
      };
    });

})();
