'use strict';

(function () {
  const delayParse = 700;

  class Comment {
    constructor() {
      this.initalized = this.loadComment();
    }

    loadComment() {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '//comment.chronopin.com/js/embed.min.js';
        script.dataset.isso = '/isso/';
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
        this.initalized
          .then(isso => {
            isso.init();
          });
      }, delayParse);
    }
  }

  angular.module('chronopinNodeApp.comment')
    .service('commentJs', Comment);
})();
