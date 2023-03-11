'use strict';

(function () {
  const delayParse = 0;

  angular.module('chronopinNodeApp.comment')
    .directive('commentCount', function (commentJs, $timeout) {

      function createHTML(commentUrl) {
        return (`
          <span class="comment-count">
            <a class="comment-num-count" href="${commentUrl}" data-isso-id="${commentUrl}"></a>
          </span>
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
