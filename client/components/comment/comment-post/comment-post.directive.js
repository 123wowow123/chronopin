'use strict';

(function () {
  const delayParse = 0;

  angular.module('chronopinNodeApp.comment')
    .directive('commentPost', function (commentJs, $timeout) {

      function createHTML(commentUrl, title) {
        return (`
          <section id="isso-thread" data-title="${title}" data-isso-id="${commentUrl}">
            <noscript>Javascript needs to be activated to view comments.</noscript>
          </section>
          `)
      }

      return {
        restrict: 'AE',
        scope: {},
        link: function postLink(scope, elem, attrs) {
          let commentUrl;
          let title;

          function render(commentUrl, title) {
            if (commentUrl && title) {
              commentJs.initalized
                .then(isso => {
                  let $el = $(createHTML(commentUrl, title));
                  elem.empty().append($el);
                });
            }
          }

          attrs.$observe('commentUrl', function (newValue) {
            commentUrl = newValue;
            render(commentUrl, title)
          });

          attrs.$observe('title', function (newValue) {
            title = newValue;
            render(commentUrl, title)
          });

        }
      };
    });

})();
