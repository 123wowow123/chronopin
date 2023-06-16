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
            scope.parser = new edjsParser(undefined, {
              header: (data, config) => {
                // This actually cleanses all anchor tags and not header
                const html = document.createElement('div');
                html.innerHTML = data.text;
                const links = html.getElementsByTagName('a');
                for (let i = 0, len = links.length; i < len; i += 1) {
                  links[i].target = '_blank';
                  links[i].rel = 'noopener noreferrer';
                }
                return html.innerHTML;
              },

              image: function image(data, config) {
                var imageConditions = "".concat(data.stretched ? "img-fullwidth" : "", " ").concat(data.withBorder ? "img-border" : "", " ").concat(data.withBackground ? "img-bg" : "");
                var imgClass = config.image.imgClass || "";
                var imageSrc;

                if (data.url) {
                  // simple-image was used and the image probably is not uploaded to this server
                  // therefore, we use the absolute path provided in data.url
                  // so, config.image.path property is useless in this case!
                  imageSrc = data.url;
                } else if (config.image.path === "absolute") {
                  imageSrc = data.file.url;
                } else {
                  imageSrc = config.image.path.replace(/<(.+)>/, function (match, p1) {
                    return data.file[p1];
                  });
                }

                if (config.image.use === "img") {
                  return "<img class=\"".concat(imageConditions, " ").concat(imgClass, "\" src=\"").concat(imageSrc, "\" alt=\"").concat(data.caption, "\">");
                } else if (config.image.use === "figure") {
                  const attributes = data.file.attributes || {};
                  var figureClass = config.image.figureClass || "";
                  var figCapClass = config.image.figCapClass || "";
                  let figure = "<figure class=\""
                    .concat(figureClass, "\"><img loading=\"lazy\" class=\"")
                    .concat(imgClass, " ")
                    .concat(imageConditions, "\" src=\"")
                    .concat(imageSrc, "\" alt=\"")
                    .concat(data.caption, "\" height=\"")
                    .concat(attributes.height, "\" width=\"")
                    .concat(attributes.width, "\"><figcaption class=\"")
                    .concat(figCapClass, "\">")
                    .concat(data.caption, "</figcaption></figure>");
                  return figure;
                }
              },

            });
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
                    const saveHtml = scope.parser.parse(jsonHtmlContent);
                    scope.onChange({ html: saveHtml })
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
