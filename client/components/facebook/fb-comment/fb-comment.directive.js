'use strict';

(function() {
  const delayParse = 100;

  angular.module('chronopinNodeApp.facebook')
    .directive('fbCommentBox', function(fb, $timeout) {

      function createHTML(href, numposts, colorscheme, width) {
        return '<div class="fb-comments" ' +
          'data-href="' + href + '" ' +
          'data-numposts="' + numposts + '" ' +
          'data-colorsheme="' + colorscheme + '" ' +
          'data-width="' + width + '">' +
          '</div>';
      }

      return {
        restrict: 'A',
        scope: {},
        link: function postLink(scope, elem, attrs) {
          attrs.$observe('pageHref', function(newValue) {
            let href = newValue,
              numposts,
              colorscheme,
              width;

            if (href) {
              numposts = attrs.numposts || 5;
              colorscheme = attrs.colorscheme || 'light';
              width = attrs.width || '100%';
              fb.initalized
                .then(FB => {
                  let $commentEl = $(createHTML(href, numposts, colorscheme, width));
                  $commentEl.hide();
                  elem.append($commentEl);

                  $timeout(() => {
                    FB.XFBML.parse(elem[0], () => {
                      $timeout(() => {
                        $commentEl.siblings().remove();
                        $commentEl.show();
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
