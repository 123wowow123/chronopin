/*jshint unused:false*/
'use strict';

(function () {

    class CommentController {

        constructor($scope, Auth) {
            this.Auth = Auth;
        }

        $onInit() {
        }

    }

    angular.module('chronopinNodeApp')
        .component('comment', {
            controller: CommentController,
            controllerAs: 'comment',
            bindings: {
                commentUrl: '@',
                title: '@'
            },
            templateUrl: 'components/comment/comment/comment.html',
        });
})();
