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
          let initSkipListenerCount = 0;

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

          EditorJS.registerRefreshQueue((resolve) => {
            resolve();
            EditorJS.ayncInit(
              "editorjs",

              (api, event) => {
                if (initSkipListenerCount === 0) {
                  if (scope.editor) {
                    scope.editor.save()
                      .then((htmlContent) => {
                        ngModel.$setViewValue(scope.parser.parse(htmlContent));
                        scope.$apply();
                      });
                  }
                } else {
                  initSkipListenerCount--;
                }
              })

              .then(({ editor, edjsParser }) => {
                setModelInstance(editor, edjsParser);
                if (ngModel.$viewValue) {
                  initSkipListenerCount++;
                  updateContent(ngModel.$viewValue);
                }
              });

          });

        }
      };
    });

})();
