'use strict';

(function () {

    class CommentLoginController {

        constructor($scope) {
        }

        $onInit() {
        }

    }

  angular.module('chronopinNodeApp.comment')
    .component('commentLogin', {
        templateUrl: 'components/comment/comment-login/comment-login.html',
        controller: CommentLoginController,
        controllerAs: "comment",
        bindings: {
            redirectUrl: '@'
        },
    });

})();
