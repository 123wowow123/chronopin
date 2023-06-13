'use strict';

(function () {
  const delayParse = 0;

  angular.module('chronopinNodeApp')
    .directive('compileMe', function ($compile, $timeout, twitterJs) {

      function beforePinInit(elem, light, pinid) {
        if (light) {
          let frames = elem.getElementsByTagName('iframe');
          for (let frame of frames) {
            const filemoonRex = /https:\/\/filemoon\.sx\/e\/([^\/\?\&]*)\/.*/
            let result1, matchId;
            result1 = filemoonRex.exec(frame.src)
            matchId = result1 && result1[1];
            if (matchId) {
              frame.src = ''
              let parent = frame.parentElement;
              let i = document.createElement("i");
              i.setAttribute('aria-hidden', 'true');
              i.classList.add("fa", "fa-play");
              let o = document.createElement("a");
              o.href = `/pin/${pinid}`;
              o.style.background = `url("https://thumbs.filemoon.sx/${matchId}.jpg")`;
              o.classList.add("overlay");
              o.appendChild(i);
              parent.appendChild(o);
            }
          }
        }
        return elem;
      }

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
        el.innerHTML = html;
        let link = $compile(el);
        link(scope);
        return el;
      }

      return {
        restrict: 'E',
        scope: {
          light: '<',
          pinid: '<'
        },
        link: function postLink(scope, elem, attrs) {
          attrs.$observe('html', function (newValue) {
            const light = scope.light;
            const pinid = scope.pinid;
            let html = newValue;
            let htmlEl = createHTML(html, scope);
            htmlEl = beforePinInit(htmlEl, light, pinid);
            let $el = $(htmlEl);
            elem.empty().append($el);
            afterPinInit(htmlEl);
          });
        }
      };
    });

})();
