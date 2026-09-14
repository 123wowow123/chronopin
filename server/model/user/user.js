'use strict';

import * as db from '../../db';
import crypto from 'crypto';
import _ from 'lodash';
import {
  Medium
} from '..';

const authTypes = ['github', 'twitter', 'facebook', 'google'];
const defaultPasswordEncryptIterations = 10000;
const defaultPasswordOutputKeyLength = 64;

let validatePresenceOf = function (value) {
  return value && value.length;
};

let prop = [
  'id',
  'userName',
  'firstName',
  'lastName',
  'gender',
  'locale',
  'facebookId',
  'googleId',
  'pictureUrl',
  'fbUpdatedTime',
  'fbVerified',
  'googleVerified',
  'about',
  'email',
  'password',
  'role',
  'provider',
  'salt',
  'websiteUrl',
  'defaultFilterSpanPreference',
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  'utcDeletedDateTime'
];

export * from './facebook.mapper';
export * from './google.mapper';

export default class User {
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
      throw "User cannot set value of arg";
    }
    return this;
  }

  patchSet(user) {
    if (user) {
      for (let i = 0; i < prop.length; i++) {
        if (!!user[prop[i]]) {
          this[prop[i]] = user[prop[i]];
        }
      }
    } else {
      throw "User cannot set value of arg";
    }
    return this;
  }

  /**
   * Authenticate - check if the passwords are the same
   *
   * @param {String} password
   * @param {Function} callback
   * @return {Boolean}
   * @api public
   */
  authenticate(password, callback) {
    if (!callback) {
      return this.password === this.encryptPassword(password);
    }

    this.encryptPassword(password, (err, pwdGen) => {
      if (err) {
        callback(err);
      }

      if (this.password === pwdGen) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    });
  }

  /**
   * Make salt
   *
   * @param {Number} byteSize Optional salt byte size, default to 16
   * @param {Function} callback
   * @return {String}
   * @api public
   */
  makeSalt(byteSize, callback) {
    var defaultByteSize = 16;

    if (typeof arguments[0] === 'function') {
      callback = arguments[0];
      byteSize = defaultByteSize;
    } else if (typeof arguments[1] === 'function') {
      callback = arguments[1];
    }

    if (!byteSize) {
      byteSize = defaultByteSize;
    }

    if (!callback) {
      return crypto.randomBytes(byteSize).toString('base64');
    }

    return crypto.randomBytes(byteSize, function (err, salt) {
      if (err) {
        callback(err);
      }
      return callback(null, salt.toString('base64'));
    });
  }

  /**
   * Encrypt password
   *
   * @param {String} password
   * @param {Function} callback
   * @return {String}
   * @api public
   */
  encryptPassword(password, callback) {
    if (!password || !this.salt) {
      if (!callback) {
        return null;
      }
      return callback(null);
    }

    var salt = new Buffer(this.salt, 'base64');

    if (!callback) {
      return crypto.pbkdf2Sync(password, salt, defaultPasswordEncryptIterations, defaultPasswordOutputKeyLength, 'sha512')
        .toString('base64');
    }

    return crypto.pbkdf2(password, salt, defaultPasswordEncryptIterations, defaultPasswordOutputKeyLength, 'sha512',
      function (err, key) {
        if (err) {
          callback(err);
        }
        return callback(null, key.toString('base64'));
      });
  }

  /**
   * Update password field
   *
   * @param {Function} fn
   * @return {String}
   * @api public
   */
  updatePassword(fn) {
    // Handle new/update passwords
    if (this.password) {
      if (!validatePresenceOf(this.password) && authTypes.indexOf(this.provider) === -1) {
        fn(new Error('Invalid password'));
      }

      // Make salt with a callback
      this.makeSalt((saltErr, salt) => {
        if (saltErr) {
          fn(saltErr);
        }
        this.salt = salt;
        this.encryptPassword(this.password, (encryptErr, hashedPassword) => {
          if (encryptErr) {
            fn(encryptErr);
          }
          this.password = hashedPassword;
          fn(null);
        });
      });
    } else {
      fn(null);
    }
  }

  save() {
    // save will always regenerate password hash
    return new Promise((resolve, reject) => {
      this.updatePassword((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    })
      .then(() => {
        return _create(this);
      })
  }

  // Inserts a backed-up user as-is: password is already a hash with its salt.
  restore() {
    return _create(this);
  }

  update() {
    // update will always regenerate password hash
    return new Promise((resolve, reject) => {
      this.updatePassword((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    })
      .then(() => {
        return _update(this);
      });
  }

  patchWithoutPassword() {
    return _update(this);
  }

  delete() {
    return _delete(this);
  }

  adminDelete() {
    return _adminDelete(this);
  }

  pick(properties) {
    return _.pick(this, properties);
  }

  toJSON() {
    // omits own and inherited properties with null values
    return _.omitBy(this, _.isNull);
  }

  static getById(id) {
    return _getOne('"id" = $1', id);
  }

  static getByFacebookId(facebookId) {
    return _getOne('"facebookId" = $1', facebookId);
  }

  static getByGoogleId(googleId) {
    return _getOne('"googleId" = $1', googleId);
  }

  static getByEmail(email) {
    return _getOne('"email" = $1', email);
  }

  static getUserByUserName(handle) {
    return _getOne('"userName" = $1', handle);
  }

}

// Every lookup loads the whole row. An update writes every column from the
// loaded object, so a lookup that left a column out used to clear it on the
// next save - a social login (loaded by email) wiped the saved filter
// preference, and saving after a load by id wiped facebookId and googleId.
// Endpoints pick what they send (pickUserProps), so loading more exposes
// nothing.
const USER_COLUMNS = [
  'id', 'userName', 'firstName', 'lastName', 'gender', 'locale', 'facebookId', 'googleId',
  'pictureUrl', 'fbUpdatedTime', 'fbVerified', 'googleVerified', 'about', 'email', 'password',
  'role', 'provider', 'salt', 'websiteUrl', 'defaultFilterSpanPreference',
  'utcCreatedDateTime', 'utcUpdatedDateTime'
];

// The editable columns, in the order create and update bind them.
const WRITE_COLUMNS = [
  'userName', 'firstName', 'lastName', 'gender', 'locale', 'facebookId', 'googleId',
  'pictureUrl', 'fbUpdatedTime', 'fbVerified', 'googleVerified', 'about', 'email',
  'password', 'provider', 'role', 'salt', 'websiteUrl'
];

function _value(value) {
  return value === undefined ? null : value;
}

function _create(user) {
  const columns = WRITE_COLUMNS.concat(['defaultFilterSpanPreference', 'utcCreatedDateTime', 'utcUpdatedDateTime', 'utcDeletedDateTime']);
  const values = WRITE_COLUMNS.map(c => _value(user[c]))
    // utcUpdatedDateTime has always been written from utcCreatedDateTime.
    .concat([_value(user.defaultFilterSpanPreference), user.utcCreatedDateTime || new Date(),
      _value(user.utcCreatedDateTime), _value(user.utcDeletedDateTime)]);

  const hasId = user.id != null;
  if (hasId) {
    columns.unshift('id');
    values.unshift(user.id);
  }

  return db.query(`
    INSERT INTO "User" (${columns.map(c => `"${c}"`).join(', ')})
    VALUES (${values.map((v, i) => `$${i + 1}`).join(', ')})
    RETURNING "id"`, values)
    .then(rows => {
      user.id = rows[0].id;
      // An explicit id (seeding) does not advance the identity sequence.
      return hasId ? db.query(
        `SELECT setval(pg_get_serial_sequence('"User"', 'id'), GREATEST((SELECT MAX("id") FROM "User"), 1))`) : undefined;
    })
    .then(() => {
      return {
        user: user
      };
    });
}

function _update(user) {
  // Written from whatever the object carries, so every caller has to load the
  // row before updating it or a saved preference is cleared.
  const columns = WRITE_COLUMNS.concat('defaultFilterSpanPreference');
  const values = WRITE_COLUMNS.map(c => _value(user[c]))
    .concat(user.defaultFilterSpanPreference || null, user.id);

  return db.query(`
    UPDATE "User"
    SET ${columns.map((c, i) => `"${c}" = $${i + 1}`).join(',\n        ')},
        "utcUpdatedDateTime" = now()
    WHERE "id" = $${values.length}`, values)
    .then(() => {
      return {
        user: user
      };
    });
}

// A soft delete.
function _delete(user) {
  return db.query(
    `UPDATE "User" SET "utcDeletedDateTime" = now() WHERE "id" = $1 RETURNING "utcDeletedDateTime"`,
    [user.id])
    .then(rows => {
      const utcDeletedDateTime = rows.length ? rows[0].utcDeletedDateTime : undefined;
      user.utcDeletedDateTime = utcDeletedDateTime;
      return {
        utcDeletedDateTime: utcDeletedDateTime,
        user: user
      };
    });
}

// Removes the row outright.
function _adminDelete(user) {
  return db.query(`DELETE FROM "User" WHERE "id" = $1`, [user.id])
    .then(() => {
      user.utcDeletedDateTime = undefined;
      return {
        user: user
      };
    });
}

// Resolves { user } for the live (not soft-deleted) row matching where, or
// { user: undefined }. userName and email are citext, so those lookups ignore
// case the way SQL Server's collation did.
function _getOne(where, param) {
  return db.query(`
    SELECT ${USER_COLUMNS.map(c => `"${c}"`).join(', ')}
    FROM "User"
    WHERE ${where} AND "utcDeletedDateTime" IS NULL`, [param])
    .then(rows => {
      return {
        user: rows.length ? new User(rows[0]) : undefined
      };
    });
}
