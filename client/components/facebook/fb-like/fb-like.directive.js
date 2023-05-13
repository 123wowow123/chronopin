'use strict';

(function() {
  const delayParse = 250;

  angular.module('chronopinNodeApp.facebook')
    .directive('fbLike', function(fb, $timeout) {

      function createHTML(href, layout, action, size, showFaces, share) {
        return '<div class="fb-like" ' +
          'data-href="' + href + '" ' +
          'data-layout="' + layout + '" ' +
          'data-action="' + action + '" ' +
          'data-size="' + size + '" ' +
          'data-show-faces="' + showFaces + '" ' +
          'data-share="' + share + '">' +
          '</div>';
      }

      return {
        restrict: 'A',
        scope: {},
        link: function postLink(scope, elem, attrs) {
          attrs.$observe('pageHref', function(newValue) {
            let href = newValue,
              layout,
              action,
              size,
              showFaces,
              share;

            if (href) {
              layout = attrs.layout || 'button_count';
              action = attrs.action || 'like';
              size = attrs.size || 'small';
              showFaces = attrs.showFaces || false;
              share = attrs.share || false;
              fb.initalized
                .then(FB => {
                  let $likeEl = $(createHTML(href, layout, action, size, showFaces, share));
                  $likeEl.hide();
                  elem.append($likeEl);

                  $timeout(() => {
                    FB.XFBML.parse(elem[0], () => {
                      $timeout(() => {
                        $likeEl.siblings().remove();
                        $likeEl.show();
                      });
                    });
                  }, delayParse);

                });
            }

          });
        }
      };
    });

})();
