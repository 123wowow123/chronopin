'use strict';

(function() {

  function DateTimeFactory() {

    let prop = [
      'id',
      'title',
      'description',
      'sourceUrl',
      'address',
      'tip',
      {
        'utcStartDateTime': Date
      },
      {
        'utcEndDateTime': Date
      },
      {
        'utcCreatedDateTime': Date
      },
      {
        'utcUpdatedDateTime': Date
      },
      'allDay',
      'alwaysShow',
      'searchScore'
    ];

    return class DateTime {
      constructor(dateTime) {

        if (dateTime) {
          this.set(dateTime);
        }
      }

      set(dateTime) {
        if (dateTime) {
          for (let i = 0; i < prop.length; i++) {
            if (typeof prop[i] === 'object') {
              this[Object.keys(prop[i])[0]] = dateTime[Object.keys(prop[i])[0]] != null ? new prop[i][Object.keys(prop[i])[0]](dateTime[Object.keys(prop[i])[0]]) : undefined; // jshint ignore:line
            } else {
              this[prop[i]] = dateTime[prop[i]];
            }
          }

        } else {
          throw 'DateTime cannot set value of arg';
        }
        return this;
      }

    };

  }

  angular.module('chronopinNodeApp.model')
    .factory('DateTimeFactory', DateTimeFactory);

})();
