'use strict';

(function () {

  // How often the badge is refreshed while signed in. Socket.io here
  // broadcasts to every client, so it is not a place for anything private.
  const PollMs = 60 * 1000;

  // A navigation also refreshes the badge, but not more often than this.
  const MinRefreshGapMs = 10 * 1000;

  class NotificationBellController {
    constructor($scope, $interval, $transitions, $document, Auth, notificationService, followService, searchService) {
      this.$scope = $scope;
      this.$interval = $interval;
      this.$transitions = $transitions;
      this.$document = $document;
      this.Auth = Auth;
      this.notificationService = notificationService;
      this.followService = followService;
      this.searchService = searchService;

      this.isOpen = false;
      this.loading = false;
      this.lastRefresh = 0;
      this.pending = {};
    }

    $onInit() {
      // Covers page load (the user resolves after this runs), login, logout
      // and switching account.
      this.$scope.$watch(() => this.Auth.getCurrentUserName(), name => {
        this.notificationService.clear();
        this.lastRefresh = 0;
        if (name) {
          this.refresh();
        }
      });

      this.poll = this.$interval(() => {
        if (!this.$document[0].hidden) {
          this.refresh();
        }
      }, PollMs);

      this.deregisterTransition = this.$transitions.onSuccess({}, () => {
        if (Date.now() - this.lastRefresh > MinRefreshGapMs) {
          this.refresh();
        }
      });

      this.$scope.$on('follow:changed', (event, status) => {
        this.notificationService.notifications
          .filter(n => n.actor.id === status.userId)
          .forEach(n => {
            n.followingBack = status.following;
          });
      });
    }

    $onDestroy() {
      this.$interval.cancel(this.poll);
      if (this.deregisterTransition) {
        this.deregisterTransition();
      }
    }

    unreadCount() {
      return this.notificationService.unreadCount;
    }

    badgeText() {
      const count = this.unreadCount();
      return count > 9 ? '9+' : String(count);
    }

    notifications() {
      return this.notificationService.notifications;
    }

    refresh() {
      if (!this.Auth.isLoggedIn()) {
        return;
      }
      this.lastRefresh = Date.now();
      return this.notificationService.refreshCount()
        .catch(angular.noop);
    }

    // Opening loads the list and clears the badge.
    onToggle(open) {
      if (!open || !this.Auth.isLoggedIn()) {
        return;
      }
      this.loading = !this.notificationService.loaded;
      return this.notificationService.load()
        .then(() => this.notificationService.markAllRead())
        .catch(angular.noop)
        .finally(() => {
          this.loading = false;
        });
    }

    // The actor's pins, via the same user: search a pin card's label runs.
    showUser(notification) {
      this.isOpen = false;
      const handle = String(notification.actor.userName || '').replace(/^@+/, '');
      this.searchService.submit(`user:${handle}`);
    }

    followBack(notification, $event) {
      $event.stopPropagation();
      const userId = notification.actor.id;
      if (this.pending[userId]) {
        return;
      }
      this.pending[userId] = true;
      return this.followService.follow(userId)
        .catch(angular.noop)
        .finally(() => {
          delete this.pending[userId];
        });
    }

    initial(notification) {
      const actor = notification.actor;
      return (actor.firstName || actor.userName || '?').replace(/^@+/, '').charAt(0).toUpperCase();
    }
  }

  angular.module('chronopinNodeApp')
    .component('notificationBell', {
      templateUrl: 'components/notification-bell/notification-bell.html',
      controller: NotificationBellController
    });
})();
