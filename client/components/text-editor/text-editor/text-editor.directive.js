'use strict';

(function () {
  angular.module('chronopinNodeApp.textEditor')
    .directive('textEditor', function (EditorJS, Util, Auth, $timeout) {

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
            scope.editor.editor = editor;
            scope.editor.parser = new edjsParser();
          };

          function render() {
            const $el = $(createHTML());
            elem.empty().append($el);
          };

          function updateContent(htmlContent) {
            scope.editor.editor.blocks.renderFromHTML(htmlContent);
          };

          render();

          ngModel.$render = function () {
            if (_.get(scope, 'editor.editor.blocks')) {
              updateContent(ngModel.$viewValue);
            }
          };

          EditorJS.registerRefreshQueue((resolve) => {
            resolve();
            EditorJS.ayncInit(
              "editorjs",
              Util.getNormalizedDescription(ngModel.$viewValue),

              (api, event) => {
                if (scope.editor.editor) {
                  scope.editor.editor.save()
                    .then((htmlContent) => {
                      ngModel.$setViewValue(scope.editor.parser.parse(htmlContent));
                      scope.$apply();
                    });
                }
              })

              .then(({ editor, edjsParser }) => {
                setModelInstance(editor, edjsParser);
                updateContent(ngModel.$viewValue);
              });

          });

        }
      };
    });

})();
