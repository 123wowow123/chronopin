/*jshint unused:false*/
'use strict';

(function () {

    class ThreadController {

        constructor($scope, Auth, pinWebService) {
            this.Auth = Auth;
            this.isLoggedIn = Auth.isLoggedIn;
            this.pinWebService = pinWebService;
        }

        $onInit() {
            this.loading = true;
            this.pinWebService.thread(this.pinId)
                .then(res => {
                    this.pins = _.get(res, "data.pins", []);
                    return res;
                })
                .catch(err => {
                    throw err;
                })
                .finally(() => {
                    this.loading = false;
                });
        }

    }

    angular.module('chronopinNodeApp')
        .component('thread', {
            controller: ThreadController,
            controllerAs: 'thread',
            bindings: {
                pinId: '<',
                config: '<'
            },
            templateUrl: 'components/thread/thread/thread.html',
        });
})();
