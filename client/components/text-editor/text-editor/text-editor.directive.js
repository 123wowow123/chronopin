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
          onChange: '&',
          tagChange: '&'
        },
        link: (scope, elem, attrs, ngModel) => {

          function setModelInstance(editor, edjsParser) {
            scope.editor = editor;
            scope.parser = new edjsParser({
              linkTool: {
                linkCardClass: 'link-tool__content',
                linkToolMainClass: 'link-tool__content',
                titleClass: 'link-tool__title',
                descriptionClass: 'link-tool__description',
                linkClass: 'link-tool__anchor',
                imgBgClass: 'link-tool__image'
              }
            }, {
              header: (data, config) => {
                // This actually cleanses all anchor tags and not header
                let html
                if (Number.isInteger(data.level)) {
                  html = document.createElement(`h${data.level}`);
                } else {
                  html = document.createElement('div');
                }
                html.innerHTML = data.text;
                const links = html.getElementsByTagName('a');
                for (let i = 0, len = links.length; i < len; i += 1) {
                  links[i].target = '_blank';
                  links[i].rel = 'noopener noreferrer';
                }
                return html.outerHTML;
              },

              linkTool: (data, config) => {
                const cfg = config.linkTool // configurations for linkTool
                // Display meta tags if available (title, description)
                const imageLink = _.get(data, 'meta.image.URL') || _.get(data, 'meta.image.url') || '';
                let imageDiv = ''
                if (imageLink && imageLink.length > 0) {
                  imageDiv = `
                    <div class="${cfg.imgBgClass}" style="background-image: url(${imageLink})"></div>
                    `
                }
                let url = new URL(data.link);
                return `
                  <a class=" ${cfg.linkCardClass}" href="${data.link}" target="_blank">
                  ${imageDiv}
                    ${_.get(data, 'meta.title.length') > 0 ? '<p class=' + cfg.titleClass + '>' + data.meta.title + '</p>' : ''}
                    ${_.get(data, 'meta.description.length') > 0 ? '<p class=' + cfg.descriptionClass + '>' + data.meta.description + '</p>' : ''}
                    <span class="${cfg.linkClass}">${url.origin}</span>
                  </a>`
              },

              image: (data, config) => {
                let imageConditions = "".concat(data.stretched ? "img-fullwidth" : "", " ").concat(data.withBorder ? "img-border" : "", " ").concat(data.withBackground ? "img-bg" : "");
                let imgClass = config.image.imgClass || "";
                let imageSrc;

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
                  let figureClass = config.image.figureClass || "";
                  let figCapClass = config.image.figCapClass || "";
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
            let range = document.createRange();
            range.selectNode(el.nextSibling);
            range.collapse(false);
            let sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          };

          function placeCaretAtEndOfTextNode(textNode) {
            let range = document.createRange();
            range.selectNode(textNode);
            range.collapse(false);
            let sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          };

          // Recurse and loop through DOM elements only once
          function treeHTML(element, matchFactories, doNotContinueCursor) {
            let nodeList = element.childNodes;

            const sel = document.getSelection();
            if (sel) {
              const anchorNode = sel.anchorNode;
              const parentNode = anchorNode.parentNode;
              console.log('tagChange sel check anchorNode', anchorNode.nodeName)
              matchFactories.forEach((f) => {
                if (parentNode.nodeName.toLowerCase() === f.nodeName.toLowerCase()) {
                  const text = anchorNode.data;
                  console.log('tagChange', text);
                  scope.tagChange({ tag: text, node: parentNode });
                }
              });
            }

            if (nodeList != null) {
              if (nodeList.length) {
                for (let i = 0; i < nodeList.length; i++) {
                  if (nodeList[i].tagName === 'A') {
                    if (nodeList[i].href && nodeList[i].href.includes("/search?q=")) {
                      const params = new URL(nodeList[i].href).searchParams;
                      const query = params.get("q");
                      matchFactories.forEach((f) => {
                        let validateContentPass = f.regexValidateContent.exec(query);

                        let parentNode = nodeList[i].parentNode;
                        if (parentNode.nodeName.toLowerCase() === f.nodeName.toLowerCase() && validateContentPass) {
                          let spaceTextNode = document.createTextNode(" ");
                          let newNode = f.nodeWrapperFactory();
                          newNode.append(query);
                          let fragment = new DocumentFragment();
                          fragment.append(newNode);
                          fragment.append(spaceTextNode);
                          parentNode.replaceWith(fragment);
                        } else if (validateContentPass) {
                          // replace node with chrono tag node
                          let newNode = f.nodeWrapperFactory();
                          newNode.append(query);
                          nodeList[i].replaceWith(newNode);
                        }
                      });
                    }
                  } else if (nodeList[i].nodeType == 3) { // if child node is **final base-case** text node
                    matchFactories.forEach((f) => {
                      let parentNode = nodeList[i].parentNode;
                      let match = f.regex.exec(nodeList[i].nodeValue);
                      let validateContentPass = f.regexValidateContent.exec(nodeList[i].nodeValue);
                      let validateContentAny = f.regexValidateAny.exec(nodeList[i].nodeValue);

                      if (parentNode.nodeName.toLowerCase() === f.nodeName.toLowerCase() && !validateContentPass && validateContentAny) {
                        //if parent is tag node then remove and rewrap
                        const oldText0 = parentNode.textContent;
                        let range0 = new Range();
                        range0.setStart(nodeList[i], validateContentAny.index);
                        range0.setEnd(nodeList[i], validateContentAny.index + validateContentAny[1].length);
                        let newNode0 = f.nodeWrapperFactory();
                        range0.surroundContents(newNode0);
                        let fragment = new DocumentFragment();
                        fragment.append(newNode0);
                        let remainerContent = oldText0.substring(validateContentAny.index + validateContentAny[1].length);
                        fragment.append(remainerContent);
                        let preRemainerContent = oldText0.substring(0, validateContentAny.index);
                        fragment.prepend(preRemainerContent);
                        parentNode.replaceWith(fragment);
                        !doNotContinueCursor && !preRemainerContent && placeCaretAtEnd(newNode0);
                        scope.tagChange({ tag: validateContentAny[1], node: newNode0 });
                      } else if (parentNode.nodeName.toLowerCase() === f.nodeName.toLowerCase() && !validateContentPass) {
                        const oldText = parentNode.textContent;
                        const newtext = document.createTextNode(oldText);
                        parentNode.replaceWith(newtext);
                        placeCaretAtEndOfTextNode(newtext);
                      } else if (parentNode.nodeName.toLowerCase() === f.nodeName.toLowerCase() && validateContentPass) {
                        validateContentPass
                      } else if (match) {
                        if (parentNode.nodeName.toLowerCase() !== f.nodeName.toLowerCase()) {
                          let range = new Range();
                          range.setStart(nodeList[i], match.index);
                          range.setEnd(nodeList[i], match.index + match[1].length);
                          let newNode = f.nodeWrapperFactory();
                          range.surroundContents(newNode);
                          placeCaretAtEnd(newNode);
                          scope.tagChange({ tag: validateContentAny[1], node: newNode });
                        } else {
                          //if parent is tag node then remove and rewrap
                          const oldText = parentNode.textContent;
                          let range2 = new Range();
                          range2.setStart(nodeList[i], match.index);
                          range2.setEnd(nodeList[i], match.index + match[1].length);
                          let newNode2 = f.nodeWrapperFactory();
                          range2.surroundContents(newNode2);
                          let fragment = new DocumentFragment();
                          fragment.append(newNode2);
                          let remainerContent = oldText.substring(match.index + match[1].length)
                          fragment.append(remainerContent);
                          parentNode.replaceWith(fragment);
                          placeCaretAtEnd(newNode2);
                          scope.tagChange({ tag: validateContentAny[1], node: newNode2 });
                        }
                      }
                    });
                  } else {
                    treeHTML(nodeList[i], matchFactories, doNotContinueCursor);
                  }
                }
              }
            }
          }

          const matchFactories = [
            {
              // hash factory
              // preCheckRegex: /(?<!class="chrono-hash-highlight">)(#[A-z\d-]+(?:\s|&nbsp;))/g,
              regex: /(#[A-z\d-]+)/, // /(#[A-z\d-]+)(?:\s|&nbsp;)/,
              regexValidateContent: /^(#[A-z\d-]+)$/,
              regexValidateAny: /(#[A-z\d-]+)/,
              nodeName: 'chronohash',
              nodeWrapperFactory: () => {
                let newNode = document.createElement('chronohash');
                newNode.classList.add('chrono-hash-highlight');
                return newNode;
              }
            },
            {
              // at factory
              // preCheckRegex: /(?<!class="chrono-at-highlight">)(@[A-z\d-]+(?:\s|&nbsp;))/g,
              regex: /(@[A-z\d-]+)/, ///(@[A-z\d-]+)(?:\s|&nbsp;)/,
              regexValidateContent: /^(@[A-z\d-]+)$/,
              regexValidateAny: /(@[A-z\d-]+)/,
              nodeName: 'chronoat',
              nodeWrapperFactory: () => {
                let newNode = document.createElement('chronoat');
                newNode.classList.add('chrono-at-highlight');
                return newNode;
              }
            },
            {
              // dollar factory
              // preCheckRegex: /(?<!class="chrono-dollar-highlight">)(\$[A-z]+[\d-]?(?:\s|&nbsp;))/g,
              regex: /(\$[A-z]+[A-z\.\d-]*|\$[0-9]+\.[A-z]{2,})/, // /(\$[A-z]+[\d-]?)(?:\s|&nbsp;)/,
              regexValidateContent: /^(\$[A-z]+[A-z\.\d-]*|\$[0-9]+\.[A-z]{2,})$/,
              regexValidateAny: /(\$[A-z]+[A-z\.\d-]*|\$[0-9]+\.[A-z]{2,})/,
              nodeName: 'chronodollar',
              nodeWrapperFactory: () => {
                let newNode = document.createElement('chronodollar');
                newNode.classList.add('chrono-dollar-highlight');
                return newNode;
              }
            }
          ];

          let previousBlockEl;
          const editorOnChange = (api, event) => {
            if (scope.editor) {
              //event && api
              const el = _.get(event, 'detail.target.holder');
              if (el) {
                if (event.type === "block-added" && previousBlockEl) {
                  treeHTML(previousBlockEl, matchFactories, true);
                }
                let firstEl = el.firstChild;
                previousBlockEl = firstEl;
                treeHTML(firstEl, matchFactories);
              }

              setTimeout(() => {
                scope.editor.save()
                  .then((jsonHtmlContent) => {
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
