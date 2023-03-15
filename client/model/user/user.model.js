'use strict';

(function() {

  function UserFactory() {

    let prop = [
      'id',
      'userName',
      'firstName',
      'lastName',
      'gender',
      'locale',
      'facebookId',
      'pictureUrl',
      'fbUpdatedTime',
      'fbverified',
      'email',
      'password',
      'role',
      'provider',
      'salt',
      'websiteUrl',
      'utcCreatedDateTime',
      'utcUpdatedDateTime',
      'utcDeletedDateTime'
    ];

    return class User {
      constructor(user) {
        if (user) {
          this.set(user);
        }
      }

      set(user) {
        if (user) {
          for (let i = 0; i < prop.length; i++) {
            this[prop[i]] = user[prop[i]];
          }
        } else {
          throw 'User cannot set value of arg';
        }
        return this;
      }

    };
  }

  angular.module('chronopinNodeApp.model')
    .factory('UserFactory', UserFactory);

})();
