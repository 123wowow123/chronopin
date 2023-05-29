'use strict';

(function () {
  const delayParse = 0;

  angular.module('chronopinNodeApp.comment')
    .directive('commentCount', function (commentJs, $timeout) {

      function createHTML(commentUrl) {
        return (`
            <a class="comment-num-count" href="${commentUrl}" data-isso-id="${commentUrl}" title="View comments"></a>
          `)
      }

      return {
        restrict: 'AE',
        scope: {},
        link: function postLink(scope, elem, attrs) {
          commentJs.registerRefreshQueue((resolve) => {
            attrs.$observe('commentUrl', function (newValue) {
              let commentUrl = newValue;
              if (commentUrl) {
                let $el = $(createHTML(commentUrl));
                elem.empty().append($el);
                resolve();
              }
            });
          });
        }
      };
    });

})();
