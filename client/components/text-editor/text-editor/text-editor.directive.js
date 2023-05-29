'use strict';

(function () {
  angular.module('chronopinNodeApp.textEditor')
    .directive('textEditor', function (EditorJS, Auth, $timeout) {

      function createHTML() {
        return (`
          <div 
            id="editorjs"
           >
          </div>
          `)
      }

      return {
        restrict: 'AE',
        require: '?ngModel',
        scope: {},
        link: function postLink(scope, elem, attrs, ngModel) {

          function setModelInstance(editor, edjsParser) {
            scope.editor = editor;
            scope.parser = new edjsParser();
          };

          function render() {
            const $el = $(createHTML());
            elem.empty().append($el);
          };

          function updateContent(htmlContent) {
            scope.editor.blocks.renderFromHTML(htmlContent);
          };

          render();

          ngModel.$render = function () {
            if (_.get(scope, 'editor.blocks')) {
              updateContent(ngModel.$viewValue);
            }
          };

          function placeCaretAtEnd(el) {
            el.focus();
            if (typeof window.getSelection != "undefined"
              && typeof document.createRange != "undefined") {
              var range = document.createRange();
              range.selectNodeContents(el);
              range.collapse(false);
              var sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
            } else if (typeof document.body.createTextRange != "undefined") {
              var textRange = document.body.createTextRange();
              textRange.moveToElementText(el);
              textRange.collapse(false);
              textRange.select();
            }
          }

          EditorJS.registerRefreshQueue((resolve) => {
            resolve();
            EditorJS.ayncInit(
              "editorjs",
              (api, event) => {
                if (scope.editor) {

                  setTimeout(() => {
                    scope.editor.save()
                      .then((htmlContent) => {
                        ngModel.$setViewValue(scope.parser.parse(htmlContent));
                        scope.$apply();
                        //event && api
                        const el = _.get(event, 'detail.target.holder');
                        if (el) {
                          let firstEl = el.firstChild;
                          const matchTagStringWithSpace = /(?<!class="chrono-hash-highlight">)(#[A-z\d-]+(?:\s|&nbsp;))/g;
                          const matchAtStringWithSpace = /(?<!class="chrono-at-highlight">)(@[A-z\d-]+(?:\s|&nbsp;))/g;

                          // Match #tag
                          if (matchTagStringWithSpace.test(firstEl.innerHTML)) {
                            const matchHashString = /(?<!class="chrono-hash-highlight">)(?<!href="\/search\?q=)(#[A-z\d-]+)/g;
                            const html = firstEl.innerHTML.replace(matchHashString, (x) => {
                              return `<a href="/search?q=${x}" class="chrono-hash-highlight">${x}</a>`
                            });
                            firstEl.innerHTML = html;
                            //add link to # search
                            // firstEl.innerHTML = firstEl.innerHTML.replace(/&nbsp;/, ' ');
                            // placeCaretAtEnd(el)
                          }
                          if (matchAtStringWithSpace.test(firstEl.innerHTML)) {
                            const matchAtString = /(?<!class="chrono-at-highlight">)(@[A-z\d-]+)/g;
                            const html = firstEl.innerHTML.replace(matchAtString, (x) => {
                              return `<a href="/search?q=${x}" class="chrono-at-highlight">${x}</a>`
                            });
                            firstEl.innerHTML = html;
                          }
                        }

                      });
                  }, 0);

                }
              })
              .then(({ editor, edjsParser }) => {
                setModelInstance(editor, edjsParser);
                if (ngModel.$viewValue) {
                  updateContent(ngModel.$viewValue);
                }
              });
          });

        }
      };
    });

})();
