'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import crypto from 'crypto';
import _ from 'lodash';
import {
  Medium
} from '..';

const authTypes = ['github', 'twitter', 'facebook', 'google'];
const defaultPasswordEncryptIterations = 10000;
const defaultPasswordOutputKeyLength = 64;

let validatePresenceOf = function(value) {
  return value && value.length;
};

let prop = [
  'id',
  'firstName',
  'lastName',
  'gender',
  'locale',
  'facebookId',
  'pictureUrl',
  'fbUpdatedTime',
  'fbverified',
  'email',
  'about',
  'password',
  'role',
  'provider',
  'salt',
  'websiteUrl',
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  'utcDeletedDateTime'
];

export * from './facebook.mapper';

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

    return crypto.randomBytes(byteSize, function(err, salt) {
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
      function(err, key) {
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
        return _createMSSQL(this);
      })
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
        return _updateMSSQL(this);
      });
  }

  delete() {
    return _deleteMSSQL(this);
  }

  adminDelete() {
    return _adminDeleteMSSQL(this);
  }

  pick(properties) {
    return _.pick(this, ...properties);
  }

  static getById(id) {
    return _getUserByIdMSSQL(id);
  }

  static getByFacebookId(facebookId) {
    return _getUserByFacebookIdMSSQL(facebookId);
  }

  static getByEmail(email) {
    return _getUserByEmailMSSQL(email);
  }

}

function _createMSSQL(user) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'CreateUser';
        let request = new mssql.Request(conn)
          // fb public attributes
          .input('firstName', mssql.NVarChar(255), user.firstName)
          .input('lastName', mssql.NVarChar(255), user.lastName)
          .input('gender', mssql.NVarChar(255), user.gender)
          .input('locale', mssql.NChar(5), user.locale)
          .input('facebookId', mssql.NVarChar(25), user.facebookId)
          .input('pictureUrl', mssql.NVarChar(255), user.pictureUrl)
          .input('fbUpdatedTime', mssql.DateTime2(7), user.fbUpdatedTime)
          .input('fbverified', mssql.Bit, user.fbverified)
          .input('about',mssql.NVarChar(1000), user.about)
          // fb private attributes
          .input('email', mssql.NVarChar(255), user.email)
          // cp attributes
          .input('password', mssql.NVarChar(255), user.password)
          .input('provider', mssql.NVarChar(255), user.provider)
          .input('role', mssql.NVarChar(255), user.role)
          .input('salt', mssql.NVarChar(255), user.salt)
          .input('websiteUrl', mssql.NVarChar(500), user.websiteUrl)
          .input('utcCreatedDateTime', mssql.DateTime2(7), user.utcCreatedDateTime)
          .input('utcUpdatedDateTime', mssql.DateTime2(7), user.utcCreatedDateTime)
          .input('utcDeletedDateTime', mssql.DateTime2(7), user.utcDeletedDateTime)
          .output('id', mssql.Int);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, recordsets, returnValue, affected) => {
            let id;
            //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              id = request.parameters.id.value;
              //console.log('queryCount', queryCount);
            } catch (e) {
              id = 0;
            }
            user.id = id;
            resolve({
              user: user
            });
          });
      });
    });
}

function _updateMSSQL(user) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'UpdateUser';
        let request = new mssql.Request(conn)
          // fb public attributes
          .input('id', mssql.Int, user.id)
          .input('firstName', mssql.NVarChar(255), user.firstName)
          .input('lastName', mssql.NVarChar(255), user.lastName)
          .input('gender', mssql.NVarChar(255), user.gender)
          .input('locale', mssql.NChar(5), user.locale)
          .input('facebookId', mssql.NVarChar(25), user.facebookId)
          .input('pictureUrl', mssql.NVarChar(255), user.pictureUrl)
          .input('fbUpdatedTime', mssql.DateTime2(7), user.fbUpdatedTime)
          .input('fbverified', mssql.Bit, user.fbverified)
          .input('about', mssql.NVarChar(1000), user.about)
          // fb private attributes
          .input('email', mssql.NVarChar(255), user.email)
          // cp attributes
          .input('password', mssql.NVarChar(255), user.password)
          .input('provider', mssql.NVarChar(255), user.provider)
          .input('role', mssql.NVarChar(255), user.role)
          .input('salt', mssql.NVarChar(255), user.salt)
          .input('websiteUrl', mssql.NVarChar(500), user.websiteUrl);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, recordsets, returnValue, affected) => {
            let id;
            //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              id = request.parameters.id.value;
              //console.log('queryCount', queryCount);
            } catch (e) {
              id = 0;
            }
            user.id = id;
            resolve({
              user: user
            });
          });
      });
    });
}

function _deleteMSSQL(user) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'DeleteUserById';
        let request = new mssql.Request(conn)
          // fb public attributes
          .input('id', mssql.Int, user.id)
          .output('utcDeletedDateTime', mssql.DateTime2(7));

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, recordsets, returnValue, affected) => {
            let utcDeletedDateTime;
            //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              utcDeletedDateTime = request.parameters.utcDeletedDateTime.value;
              //console.log('queryCount', queryCount);
            } catch (e) {
              console.log(`[dbo].[${StoredProcedureName}]`, e);
            }
            user.utcDeletedDateTime = utcDeletedDateTime;
            resolve({
              utcDeletedDateTime: utcDeletedDateTime,
              user: user
            });
          });
      });
    });
}

function _adminDeleteMSSQL(user) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'AdminDeleteUserById';
        let request = new mssql.Request(conn)
          // fb public attributes
          .input('id', mssql.Int, user.id);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, recordsets, returnValue, affected) => {
            let utcDeletedDateTime;
            //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              utcDeletedDateTime = request.parameters.utcDeletedDateTime.value;
              //console.log('queryCount', queryCount);
            } catch (e) {
              console.log(`[dbo].[${StoredProcedureName}]`, e);
            }
            user.utcDeletedDateTime = utcDeletedDateTime;
            resolve({
              user: user
            });
          });
      });
    });
}

function _getUserByIdMSSQL(id) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'GetUserById';
        let user;
        let request = new mssql.Request(conn)
          // fb public attributes
          .input('id', mssql.INT, id);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, recordsets, returnValue, affected) => {
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (recordsets[0].length) {
              user = new User(recordsets[0] && recordsets[0][0]);
            } else {
              user = undefined;
            }
            resolve({
              user: user
            });
          });
      });
    });
}

function _getUserByFacebookIdMSSQL(facebookId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'GetUserByFacebookId';
        let user;
        let request = new mssql.Request(conn)
          .input('facebookId', mssql.NVarChar(25), facebookId);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, recordsets, returnValue, affected) => {
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (recordsets[0].length) {
              //console.log('_getUserByFacebookIdMSSQL', recordsets[0]);
              user = new User(recordsets[0] && recordsets[0][0]);
              //console.log('_getUserByFacebookIdMSSQL constructed', user);
            } else {
              user = undefined;
            }
            resolve({
              user: user
            });
          });
      });
    });
}

function _getUserByEmailMSSQL(email) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'GetUserByEmail';
        let user;
        let request = new mssql.Request(conn)
          // fb public attributes
          .input('email', mssql.NVarChar, email);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, recordsets, returnValue, affected) => {
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (recordsets[0].length) {
              user = new User(recordsets[0] && recordsets[0][0]);
            } else {
              user = undefined;
            }
            resolve({
              user: user
            });
          });
      });
    });
}
