'use strict';

(function () {
  const delayParse = 500;

  class Comment {
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

    loadCommentAsync() {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '//comment.chronopin.com/js/embed.min.js';
        script.dataset.isso = '//comment.chronopin.com/';
        script.dataset.issoCssUrl = '//comment.chronopin.com/css/isso.css';
        script.onload = () => {
          resolve(window.Isso);
        };
        script.onerror = reject;
        document.head.append(script);
      });
    }

    ayncRefresh() {
      setTimeout(() => {
        this.queue
          .then(() => {
            if (!this.initalized) {
              this.initalized = this.loadCommentAsync();
            }
            this.initalized.then((isso) => {
              isso.init();
              isso.fetchComments();
            });
          });
      }, delayParse);
    }
  }

  angular.module('chronopinNodeApp.comment')
    .service('commentJs', Comment);
})();
