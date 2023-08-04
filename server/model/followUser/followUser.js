'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import _ from 'lodash';
import {
  User,
  Pins
} from '..';

let prop = [
  'id',
  'userId',
  'followingUserId',
  'utcCheckedDateTime',
  'utcCreatedDateTime'
];

export default class FollowUser {
  constructor(that) {
    if (that) {
      this.set(that);
    }
  }

  set(that) {
    if (that) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = that[prop[i]];
      }
    } else {
      throw "FollowUser cannot set value of arg";
    }
    return this;
  }

  save() {
    return _upsert(this)
      .catch(err => {
        console.log(`FollowUser '${this.id}' save err:`, err);
        throw err;
      });
  }

  update() {
    return _upsert(this)
      .catch(err => {
        console.log(`FollowUser '${this.id}' update err:`, err);
        throw err;
      });
  }

  delete() {
    return _deleteMSSQL(this);
  }

  setUser(user) {
    this._user = user;
    this.userId = user.id;
    return this;
  }

  setFollowUser(followUser) {
    this._followUser = followUser;
    this.followingUserId = followUser.id;
    return this;
  }

  toJSON() {
    // omits own and inherited properties with null values
    return _.omitBy(this, (value, key) => {
      return key.startsWith('_')
        || _.isNull(value);
    });
  }

  static queryFollowingByUserName(userName) {
    return _queryMSSQLFollowingUsersByUserName(userName);
  }

  static queryFollowerByUserName(userName) {
    return _queryMSSQLFollowerUsersByUserName(userName);
  }

  static queryIsFollowingByUserName(userId, userName) {
    return _queryIsFollowingByUserName(userId, userName);
  }

  // Bell functionality
  static getAggregateUnreadCount(userId) {
    return _queryMSSQLGetAggregateUnreadCount(userId);
  }

  static getAggregateUnread(userId) {
    return _queryMSSQLGetAggregateUnread(userId)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryMSSQLGetAggregatePins(userId) {
    return _queryMSSQLGetAggregatePins(userId)
      .then(res => {
        return new Pins(res);
      });
  }

  static updateLastCheckedAggregateUnread(userId, checkedDateTime) {
    return _queryMSSQLUpdateLastCheckedAggregateUnread(userId, checkedDateTime);
  }

}

const FollowUserPrototype = FollowUser.prototype;

Object.defineProperty(FollowUserPrototype, '_user', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(FollowUserPrototype, 'userId', {
  get: function () {
    return this._user && this._user.id;
  },
  set: function (id) {
    if (this._user) {
      this._user.id = id;
    } else {
      this._user = new User({
        id: id
      });
    }
  },
  enumerable: true,
  configurable: false
});

Object.defineProperty(FollowUserPrototype, '_followUser', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(FollowUserPrototype, 'followingUserId', {
  get: function () {
    return this._followUser && this._followUser.id;
  },
  set: function (id) {
    if (this._followUser) {
      this._followUser.id = id;
    } else {
      this._followUser = new User({
        id: id
      });
    }
  },
  enumerable: true,
  configurable: false
});

function _upsert(followUserIn) {
  return _upsertMSSQL(followUserIn)
    .then(({
      followUser
    }) => {
      followUserIn.set(followUser);
      return {
        followUser: followUserIn
      };
    })
}

function _queryMSSQLFollowingUsersByUserName(userName) {
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'GetFollowingUsersByUserName';
        let request = new mssql.Request(conn)
          .input('userName', mssql.NVarChar, userName)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
            let count;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${JSON.stringify(err)}`);
            }
            if (res.recordset.length) {
              count = res.recordset[0];
            } else {
              count = undefined;
            }
            resolve(count);
          });
      });
    }).catch(err => {
      // ... connect error checks
      console.log(`${StoredProcedureName} catch err`, err);
      throw err;
    });
}

function _queryMSSQLFollowerUsersByUserName(userName) {
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'GetFollowerUsersByUserName';
        let request = new mssql.Request(conn)
          .input('userName', mssql.NVarChar, userName)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
            let count;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${JSON.stringify(err)}`);
            }
            if (res.recordset.length) {
              count = res.recordset[0];
            } else {
              count = undefined;
            }
            resolve(count);
          });
      });
    }).catch(err => {
      // ... connect error checks
      console.log(`${StoredProcedureName} catch err`, err);
      throw err;
    });
}

function _queryIsFollowingByUserName(userId, userName) {
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'GetIsFollowingByUserName';
        let request = new mssql.Request(conn)
          .input('currentUserId', mssql.Int, userId)
          .input('userName', mssql.NVarChar, userName)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
            let count;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${JSON.stringify(err)}`);
            }
            if (res.recordset.length) {
              count = res.recordset[0];
            } else {
              count = undefined;
            }
            resolve(count);
          });
      });
    }).catch(err => {
      // ... connect error checks
      console.log(`${StoredProcedureName} catch err`, err);
      throw err;
    });
}

function _upsertMSSQL(followUser) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'CreateMergeFollowUser';
        let request = new mssql.Request(conn)
          .input('userId', mssql.Int, followUser.userId)
          .input('followingUserId', mssql.Int, followUser.followingUserId)
          .input('utcCreatedDateTime', mssql.DateTime2(7), followUser.utcCreatedDateTime)
          .input('utcCheckedDateTime', mssql.DateTime2(7), followUser.utcCheckedDateTime)
          .output('id', mssql.Int);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${JSON.stringify(err)}`);
            }
            try {
              followUser.id = res.output.id;
            } catch (e) {
              throw e;
            }

            resolve({
              followUser
            });

          });
      });
    });
}

function _deleteMSSQL(followUser) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'DeleteFollowUser';
        let request = new mssql.Request(conn)
          .input('userId', mssql.Int, followUser.userId)
          .input('followingUserId', mssql.Int, followUser.followingUserId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            resolve({
              followUser
            });
          });
      });
    });
}

// Bell functionality
function _queryMSSQLGetAggregateUnreadCount(userId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'GetFollowUserUnreadCount';
        let request = new mssql.Request(conn)
          .input('currentUserId', mssql.Int, userId)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
            let count;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${JSON.stringify(err)}`);
            }
            if (res.recordset.length) {
              count = res.recordset[0];
            } else {
              count = undefined;
            }
            resolve(count);
          });
      });
    }).catch(err => {
      // ... connect error checks
      console.log(`${StoredProcedureName} catch err`, err);
      throw err;
    });
}

function _queryMSSQLGetAggregateUnread(userId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'GetFollowUserUnread';
        let request = new mssql.Request(conn)
          .input('currentUserId', mssql.Int, userId)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${JSON.stringify(err)}`);
            }

            resolve({
              pins: res.recordset
            });
          });
      });
    }).catch(err => {
      // ... connect error checks
      console.log(`${StoredProcedureName} catch err`, err);
      throw err;
    });
}

function _queryMSSQLGetAggregatePins(userId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'createGetFollowUserPinsSP';
        let request = new mssql.Request(conn)
          .input('currentUserId', mssql.Int, userId)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${JSON.stringify(err)}`);
            }

            resolve({
              pins: res.recordset
            });
          });
      });
    }).catch(err => {
      // ... connect error checks
      console.log(`${StoredProcedureName} catch err`, err);
      throw err;
    });
}

function _queryMSSQLUpdateLastCheckedAggregateUnread(userId, checkedDateTime) {
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'UpdateAlFollowUserCheckedDateTime';
        let request = new mssql.Request(conn)
          .input('currentUserId', mssql.Int, userId)
          .input('utcCheckedDateTime', mssql.DateTime2(7), checkedDateTime.toISOString())
          .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${JSON.stringify(err)}`);
            }
            resolve(res);
          });
      });
    }).catch(err => {
      // ... connect error checks
      console.log(`${StoredProcedureName} catch err`, err);
      throw err;
    });
}