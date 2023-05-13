'use strict';

(function () {
  const delayParse = 0;

  angular.module('chronopinNodeApp.comment')
    .directive('commentPost', function (commentJs, Auth, $timeout) {

      function createHTML(commentUrl, title, author, email) {
        return (`
          <section 
            id="isso-thread" 
            data-isso-postbox="${email ? "true" : "false"}" 
            data-isso-vote="${email ? "true" : "false"}"
            data-isso-modify="${email ? "true" : "false"}"
            ${title ? `data-isso-title="${title}"` : ''} 
            ${commentUrl ? `data-isso-id="${commentUrl}"` : ''} 
            ${author ? `data-isso-author="${author}"` : ''}  
            ${email ? `data-isso-email="${email}"` : ''}
           >
            <noscript>Javascript needs to be activated to view comments.</noscript>
          </section>
          `)
      }

      return {
        restrict: 'AE',
        scope: {},
        link: function postLink(scope, elem, attrs) {
          let commentUrl;
          let title;
          let email;
          let author;

          commentJs.registerRefreshQueue((resolve) => {
            const currentUserPromise = Auth.getCurrentUser();
            currentUserPromise.then(currentUser => {
              if (currentUser.email) {
                email = currentUser.email;
                author = Auth.getCurrentUserName();
              }
            });

            attrs.$observe('commentUrl', function (newValue) {
              commentUrl = newValue;
              currentUserPromise.then(() => {
                render(commentUrl, title, author, email);
              });
            });

            attrs.$observe('title', function (newValue) {
              title = newValue;
              currentUserPromise.then(() => {
                render(commentUrl, title, author, email);
              });
            });

            function render(commentUrl, title, author, email) {
              if (commentUrl && title) {
                let $el = $(createHTML(commentUrl, title, author, email));
                elem.empty().append($el);

                resolve();
              }
            }

          });

        }
      };
    });

})();
