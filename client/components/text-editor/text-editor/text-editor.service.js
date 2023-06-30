'use strict';

(function () {
  class TextEditorJS {
    constructor($injector) {
      this.$injector = $injector;
      this.initialized;
      this.queue = Promise.resolve();
    }

    registerRefreshQueue(waitForFn) {
      const promise = new Promise((resolve, reject) => {
        waitForFn(resolve);
      });
      this.queue = this.queue.then(promise);
    }

    loadJsAsync() {
      function loadJSPromise(moduleName, url) {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = url;
          script.onload = () => {
            resolve(window[moduleName]);
          };
          script.onerror = reject;
          document.head.append(script);
        });
      };

      const editorJsPromise = loadJSPromise('EditorJS', 'https://cdn.jsdelivr.net/npm/@editorjs/editorjs@2.26.5/dist/editor.min.js');
      const edjsParserPromise = loadJSPromise('edjsParser', 'https://cdn.jsdelivr.net/npm/editorjs-parser@1/build/Parser.browser.min.js');
      const headerJsPromise = loadJSPromise('Header', 'https://cdn.jsdelivr.net/npm/@editorjs/header@2.7.0/dist/bundle.min.js');
      const listJsPromise = loadJSPromise('List', 'https://cdn.jsdelivr.net/npm/@editorjs/list@1.8.0/dist/bundle.min.js');
      const strikethroughPromise = loadJSPromise('Strikethrough', 'https://cdn.jsdelivr.net/npm/@sotaproject/strikethrough@1.0.1/dist/bundle.min.js');
      const embedPromise = loadJSPromise('Embed', 'https://cdn.jsdelivr.net/npm/@editorjs/embed@latest');
      const ImageToolPromise = loadJSPromise('ImageTool', 'https://cdn.jsdelivr.net/gh/123wowow123/image@v1.0-beta.4/dist/bundle.js');
      const LinkToolPromise = loadJSPromise('LinkTool', 'https://cdn.jsdelivr.net/npm/@editorjs/link@2.5.0/dist/bundle.min.js');

      const HashTagTool = this.$injector.get('HashTagTool');
      const DollarTagTool = this.$injector.get('DollarTagTool');
      const AtTagTool = this.$injector.get('AtTagTool');

      return Promise.all([editorJsPromise, headerJsPromise, listJsPromise, strikethroughPromise, edjsParserPromise, embedPromise, ImageToolPromise, LinkToolPromise])
        .then(([EditorJS, Header, List, Strikethrough, edjsParser, Embed, ImageTool, LinkTool]) => {
          return { EditorJS, Header, List, Strikethrough, edjsParser, Embed, ImageTool, LinkTool, HashTagTool, DollarTagTool, AtTagTool };
        });
    }

    ayncInit(elId, onChange, data) {
      return this.queue
        .then(() => {
          if (!this.initialized) {
            this.initialized = this.loadJsAsync();
          }
          return this.initialized
            .then(({ EditorJS, Header, List, Strikethrough, edjsParser, Embed, ImageTool, LinkTool, HashTagTool, DollarTagTool, AtTagTool }) => {

              const editor = new EditorJS({
                holder: elId,
                placeholder: "Tell everyone what the content is about. (try pasting images, youtube, twitter urls)",

                logLevel: 'VERBOSE',

                //readOnly: true,

                data,

                tools: {
                  header: {
                    class: Header,
                    shortcut: 'CMD+SHIFT+H',
                    inlineToolbar: true,
                    config: {
                      levels: [2, 3, 4],
                      defaultLevel: 2
                    }
                  },
                  list: {
                    class: List,
                    inlineToolbar: true,
                    config: {
                      defaultStyle: 'unordered'
                    }
                  },
                  strikethrough: Strikethrough,
                  embed: {
                    class: Embed,
                    inlineToolbar: true,
                    config: {
                      services: {
                        codepen: {
                          regex: /https:\/\/filemoon\.sx\/d\/([^\/\?\&]*)\/?.*/,
                          embedUrl: 'https://filemoon.sx/e/<%= remote_id %>/',
                          html: `<iframe loading="lazy"
                           frameborder="0" marginwidth="0" marginheight="0" scrolling="no" width="640" height="360" allowfullscreen alt="">'
                          ></iframe>`,
                          id: (groups) => groups.join('')
                        }
                      }
                    }
                  },

                  image: {
                    class: ImageTool,
                    config: {
                      endpoints: {
                        byFile: '/api/upload/uploadFile', // Your backend file uploader endpoint
                        byUrl: '/api/upload/fetchUrl', // Your endpoint that provides uploading by Url
                      },
                      attributes: {}
                    }
                  },

                  linkTool: {
                    class: LinkTool,
                    config: {
                      endpoint: '/api/meta/fetchUrl', // Your backend endpoint for url data fetching,
                    }
                  },
               
                  hashTagTool: {
                    class: HashTagTool,
                  },

                  dollarTagTool: {
                    class: DollarTagTool,
                  },

                  atTagTool: {
                    class: AtTagTool,
                  }

                },

                /**
                 * onChange callback
                 */
                onChange: (api, event) => {
                  onChange(api, event);
                },

                // sanitizer: {
                //   a: {
                //     href: true, // leave <a> with href
                //     target: '_blank' // add 'target="_blank"'
                //   }
                // }

              });

              return editor.isReady
                .then(() => {
                  return { editor, edjsParser };
                })
            });
        });

    }
  }

  angular.module('chronopinNodeApp.textEditor')
    .service('EditorJS', TextEditorJS);
})();
