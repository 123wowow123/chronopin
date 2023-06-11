'use strict';

(function () {
  const delayParse = 0;

  angular.module('chronopinNodeApp')
    .directive('compileMe', function ($compile,  $timeout, twitterJs) {

      function afterPinInit(elem) {
        twitterJs.initalized
          .then(twttr => {
            $timeout(() => {
              twttr.widgets.load(elem);
            }, delayParse);
          });
      }

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

            // scope.$apply(() => {
              let html = newValue;
              let htmlEl = createHTML(html, scope);
              let $el = $(htmlEl);
              elem.empty().append($el);
              afterPinInit(htmlEl);
            // });


          });
        }
      };
    });

})();
