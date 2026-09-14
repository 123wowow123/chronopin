'use strict';

// "3 hours ago" from a date or ISO string.
angular.module('chronopinNodeApp')
  .filter('timeAgo', function () {
    return function (value) {
      return value ? moment(value).fromNow() : '';
    };
  });
