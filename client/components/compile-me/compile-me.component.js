'use strict';

(function () {
  const delayParse = 0;

  angular.module('chronopinNodeApp')
    .directive('compileMe', function ($compile) {

      function createHTML(html, scope) {
        let el = document.createElement('DIV');
        el.innerHTML = html
        let link = $compile(el);
        link(scope);
        return el;
      }

      return {
        restrict: 'AE',
        scope: {},
        link: function postLink(scope, elem, attrs) {
          attrs.$observe('html', function (newValue) {
            let html = newValue;
            let $el = $(createHTML(html, scope));
            elem.empty().append($el);
          });
        }
      };
    });

})();
