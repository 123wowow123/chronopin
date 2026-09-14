'use strict';

(function () {

  // The signed-in user's notifications and unread count, kept in a service so
  // they survive the bell being re-created when you sign in or out.
  class NotificationService {
    constructor($http, $q) {
      this.$http = $http;
      this.$q = $q;

      this.unreadCount = 0;
      this.notifications = [];
      this.loaded = false;
    }

    refreshCount() {
      return this.$http.get('/api/notifications/unread-count')
        .then(res => {
          this.unreadCount = res.data.unreadCount;
          return this.unreadCount;
        });
    }

    load() {
      return this.$http.get('/api/notifications')
        .then(res => {
          this.notifications = res.data.notifications;
          this.unreadCount = res.data.unreadCount;
          this.loaded = true;
          return this.notifications;
        });
    }

    // Clears the badge. The list keeps each item's own `read` flag, so what
    // was new still stands out while the menu is open.
    markAllRead() {
      if (!this.unreadCount) {
        return this.$q.resolve();
      }
      this.unreadCount = 0;
      return this.$http.post('/api/notifications/read');
    }

    // Signing out must not leave the previous account's bell behind.
    clear() {
      this.unreadCount = 0;
      this.notifications = [];
      this.loaded = false;
    }
  }

  angular.module('chronopinNodeApp')
    .service('notificationService', NotificationService);
})();
