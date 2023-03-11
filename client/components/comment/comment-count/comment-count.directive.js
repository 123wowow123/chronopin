'use strict';

(function () {
  const delayParse = 0;

  angular.module('chronopinNodeApp.comment')
    .directive('commentCount', function (commentJs, $timeout) {

      function createHTML(commentUrl) {
        return (`
          <a href="${commentUrl}" data-isso-id="${commentUrl}"></a>
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
