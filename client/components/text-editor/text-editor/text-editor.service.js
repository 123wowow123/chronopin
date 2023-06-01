'use strict';

(function () {
  class TextEditorJS {
    constructor() {
      this.initalized;
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
      const headerJsPromise = loadJSPromise('Header', 'https://cdn.jsdelivr.net/npm/@editorjs/header@2.7.0/dist/bundle.min.js');
      const listJsPromise = loadJSPromise('List', 'https://cdn.jsdelivr.net/npm/@editorjs/list@1.8.0/dist/bundle.min.js');
      const strikethroughPromise = loadJSPromise('Strikethrough', 'https://cdn.jsdelivr.net/npm/@sotaproject/strikethrough@1.0.1/dist/bundle.min.js');
      const edjsParserPromise = loadJSPromise('edjsParser', 'https://cdn.jsdelivr.net/npm/editorjs-parser@1/build/Parser.browser.min.js');
      const embedPromise = loadJSPromise('Embed', 'https://cdn.jsdelivr.net/npm/@editorjs/embed@latest');
      const ImageToolPromise = loadJSPromise('ImageTool', 'https://cdn.jsdelivr.net/npm/@editorjs/image@2.3.0');


      return Promise.all([editorJsPromise, headerJsPromise, listJsPromise, strikethroughPromise, edjsParserPromise, embedPromise, ImageToolPromise])
        .then(([EditorJS, Header, List, Strikethrough, edjsParser, Embed, ImageTool]) => {
          return { EditorJS, Header, List, Strikethrough, edjsParser, Embed, ImageTool };
        });
    }

    ayncInit(elId, onChange) {
      return this.queue
        .then(() => {
          if (!this.initalized) {
            this.initalized = this.loadJsAsync();
          }
          return this.initalized
            .then(({ EditorJS, Header, List, Strikethrough, edjsParser, Embed, ImageTool }) => {

              const editor = new EditorJS({
                holder: elId,
                placeholder: "Tell everyone what the content is about",

                logLevel: 'VERBOSE',

                //readOnly: true,

                // data,

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
                    inlineToolbar: true
                  },

                  image: {
                    class: ImageTool,
                    config: {
                      endpoints: {
                        byFile: '/upload/uploadFile', // Your backend file uploader endpoint
                        byUrl: '/upload/fetchUrl', // Your endpoint that provides uploading by Url
                      }
                    }
                  }

                },

                /**
                 * onChange callback
                 */
                onChange: (api, event) => {
                  onChange(api, event);
                }

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
