/*jshint unused:false*/
'use strict';

(function () {

    class Controller {

        constructor(Auth, profileWebService) {
            this.Auth = Auth;
            this.profileWebService = profileWebService;
        }

        $onInit() {
            const userName = this.userName;
            this._refreshProfile(userName);
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
        .component('profileMenu', {
            controller: Controller,
            controllerAs: 'vm',
            bindings: {
                userName: '<'
            },
            templateUrl: 'components/profile-menu/profile-menu.html',
        });
})();
