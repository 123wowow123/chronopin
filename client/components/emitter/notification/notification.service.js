'use strict';

(function () {
  const refreshInterval = 60000;

  class Notification {
    constructor(profileWebService, $rootScope) {
      this.profileWebService = profileWebService;
      this.$rootScope = $rootScope;
    }

    init() {
      this.refresh();

      setTimeout(() => {
        this.profileWebService.getAggregateUnreadCount()
          .then((res) => {
            const count = res.data;
            this.$rootScope.$broadcast('notification:count', {
              count
            });
          })
      }, refreshInterval); // 1 minute
    }

    refresh() {
      this.profileWebService.getAggregateUnreadCount()
        .then((res) => {
          const count = res.data;
          this.$rootScope.$broadcast('notification:count', {
            count
          });
        })
    }
  }

  angular.module('chronopinNodeApp')
    .service('notificationJs', Notification);
})();
