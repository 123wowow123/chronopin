/*jshint unused:false*/
'use strict';

(function () {

    class Controller {

        constructor($scope, Auth, profileWebService) {
            this.Auth = Auth;
            this.profileWebService = profileWebService;
        }

        $onInit() {
            const userName = this.userName;
            this._refreshProfile(userName);
        }

        clickFollow() {
            const userName = this.userName;
            if (this.user.isFollowing) {
                this.profileWebService.unfollow(userName)
                    .then((t) => {
                        this._refreshProfile(userName);
                    });
            } else {
                this.profileWebService.follow(userName)
                    .then((t) => {
                        this._refreshProfile(userName);
                    });
            }
        }

        _refreshProfile(userName) {
            if (userName) {
                this.profileWebService.getUserByUserName(userName)
                    .then((res) => {
                        const user = _.get(res, 'data');
                        this.user = user;
                    })
                    .finally(() => {
                        this.loading = false;
                    });
            }
        }

    }

    angular.module('chronopinNodeApp')
        .component('profileBlock', {
            controller: Controller,
            controllerAs: 'vm',
            bindings: {
                userName: '<'
            },
            templateUrl: 'components/profile-block/profile-block.html',
        });
})();
