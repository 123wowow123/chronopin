/*jshint eqnull:true */

'use strict';

import * as db from '../../db';

import {
  User
} from '..';

export default class Users {
  // Properties
  // this.users
  // this.queryCount - probably not needed

  constructor(users) {
    if (users) {
      this.set(users);
    }
  }

  set(users) {
    if (Array.isArray(users)) {
      this
        .setUsers(users)
        .setQueryCount(undefined);
    } else if (users.users && Number.isInteger(users.queryCount)) {
      this
        .setUsers(users.users)
        .setQueryCount(users.queryCount);
    } else {
      throw "Users cannot set value of arg";
    }
    return this;
  }

  setUsers(users) {
    if (Array.isArray(users)) {
      this.users = users.map(u => {
        return new User(u);
      });
    } else {
      throw "arg is not an array";
    }
    return this;
  }

  setQueryCount(queryCount) {
    if (Number.isInteger(queryCount) || queryCount == null) {
      this.queryCount = queryCount;
    } else {
      throw "arg is not an integer, undefined, null";
    }
    return this;
  }

  save() {
    return this;
  }

  pick(properties) {
    return new Users(this.users.map(user => {
      return user.pick(properties);
    }));
  }

  static getAll(properties) {
    return _getAllUsers()
      .then(({
        users
      }) => {
        return users
          .setQueryCount(users.users.length)
          .pick(properties);
      });
  }
}

// Every live user, whole rows like User's own lookups; callers pick the
// properties they need.
function _getAllUsers() {
  return db.query(`
    SELECT "id", "userName", "firstName", "lastName", "gender", "locale", "facebookId", "googleId",
           "pictureUrl", "fbUpdatedTime", "fbVerified", "googleVerified", "about", "email", "password",
           "role", "provider", "salt", "websiteUrl", "defaultFilterSpanPreference",
           "utcCreatedDateTime", "utcUpdatedDateTime"
    FROM "User"
    WHERE "utcDeletedDateTime" IS NULL
    ORDER BY "id"`)
    .then(rows => {
      return {
        users: new Users(rows)
      };
    });
}
