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
        scope: {
          description: '<',
          onChange: '&'
        },
        link: function postLink(scope, elem, attrs, ngModel) {

          function setModelInstance(editor, edjsParser) {
            scope.editor = editor;
            scope.parser = new edjsParser();
          };

          function render() {
            const $el = $(createHTML());
            elem.empty().append($el);
          };

          function updateFromHtmlContent(htmlContent) {
            scope.editor.blocks.renderFromHTML(htmlContent);
          };

          function refreshRender(data) {
            scope.editor.blocks.clear();
            scope.editor.blocks.render(data);
          };

          render();

          let hasInit = false;
          ngModel.$render = function () {
            if (_.get(scope, 'editor.blocks')) {
              refreshRender(ngModel.$viewValue);
            } else if (hasInit === false) {
              hasInit = true;
              init();
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

          const editorOnChange = (api, event) => {
            if (scope.editor) {
              setTimeout(() => {
                scope.editor.save()
                  .then((jsonHtmlContent) => {
                    //event && api
                    const el = _.get(event, 'detail.target.holder');
                    if (el) {

                      const hashEls = el.getElementsByClassName('chrono-dollar-highlight');
                      console.log('hashEls', hashEls.length);

                      let firstEl = el.firstChild;
                      const matchTagStringWithSpace = /(?<!class="chrono-hash-highlight">)(#[A-z\d-]+(?:\s|&nbsp;))/g;
                      const matchAtStringWithSpace = /(?<!class="chrono-at-highlight">)(@[A-z\d-]+(?:\s|&nbsp;))/g;
                      const matchDollarStringWithSpace = /(?<!class="chrono-at-highlight">)(\$[A-z]+[\d-]?(?:\s|&nbsp;))/g;

                      // Match #tag
                      if (matchTagStringWithSpace.test(firstEl.innerHTML)) {
                        const matchHashString = /(?<!class="chrono-hash-highlight">)(#[A-z\d-]+)/g;
                        const html = firstEl.innerHTML.replace(matchHashString, (x) => {
                          return `<chronohash class="chrono-hash-highlight">${x}</chronohash>`
                        });
                        firstEl.innerHTML = html;
                        //add link to # search
                        // firstEl.innerHTML = firstEl.innerHTML.replace(/&nbsp;/, ' ');
                        // placeCaretAtEnd(el)
                      }
                      // Match @tag
                      if (matchAtStringWithSpace.test(firstEl.innerHTML)) {
                        const matchAtString = /(?<!class="chrono-at-highlight">)(@[A-z\d-]+)/g;
                        const html = firstEl.innerHTML.replace(matchAtString, (x) => {
                          return `<chronoat class="chrono-at-highlight">${x}</chronoat>`
                        });
                        firstEl.innerHTML = html;
                      }
                      // Match $tag
                      if (matchDollarStringWithSpace.test(firstEl.innerHTML)) {
                        const matchDollarString = /(?<!class="chrono-dollar-highlight">)(\$[A-z]+[\d-]?)/g;
                        const html = firstEl.innerHTML.replace(matchDollarString, (x) => {
                          return `<chronodollar class="chrono-dollar-highlight">${x}</chronodollar>`
                        });
                        firstEl.innerHTML = html;
                      }
                    }

                    ngModel.$setViewValue(jsonHtmlContent);
                    scope.onChange({ html: scope.parser.parse(jsonHtmlContent) })
                  });
              }, 0);
            }
          }

          function init() {
            EditorJS.registerRefreshQueue((resolve) => {
              setTimeout(() => {
                const data = ngModel.$viewValue;
                resolve();
                EditorJS.ayncInit(
                  "editorjs",
                  editorOnChange,
                  data
                )
                  .then(({ editor, edjsParser }) => {
                    setModelInstance(editor, edjsParser);
                    if (!ngModel.$viewValue && scope.description) {
                      updateFromHtmlContent(scope.description);
                    }
                  });
              }, 0);
            });
          }

        }
      };
    });

})();
