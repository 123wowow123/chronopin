'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import _ from 'lodash';
import {
  User,
  BasePin
} from '..';

// _user, userId, _pin, pinId
let prop = [
  'id',
  'like',
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  //'utcDeletedDateTime'
];

export default class Like {
  constructor(like, user, pin) {
    if (like) {
      this.set(like, user, pin);
    }
  }

  set(like, user, pin) {
    if (like) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = like[prop[i]];
      }

      if (user && user instanceof User) {
        this._user = user;
      }
      else if (like._user && like._user instanceof User) {
        this._user = like._user;
      }
      else if (Number.isInteger(like.userId)) {
        this.userId = like.userId;
      }

      if (pin instanceof BasePin) {
        this._pin = pin;
      }
      else if (like._pin && like._pin instanceof BasePin) {
        this._pin = like._pin;
      }
      else if (Number.isInteger(like.pinId)) {
        this.pinId = like.pinId;
      }

    } else {
      throw "Like cannot set value of arg";
    }
    return this;
  }

  save() {
    return _upsert(this, this.userId, this.pinId)
      .catch(err => {
        console.log(`Like '${this.id}' save err:`, err);
        throw err;
      });
  }

  update() {
    return _upsert(this, this.userId, this.pinId)
      .catch(err => {
        console.log(`Like '${this.id}' update err:`, err);
        throw err;
      });
  }

  delete() {
    return _deleteMSSQL(this);
  }

  deleteByPinId() {
    return _deleteByPinIdMSSQL(this);
  }

  setUser(user) {
    this._user = user;
    this.userId = user.id;
    return this;
  }

  setPin(pin) {
    this._pin = pin;
    this.pinId = pin.id;
    return this;
  }

  toJSON() {
    // omits own and inherited properties with null values
    return _.omitBy(this, (value, key) => {
      return key.startsWith('_')
        || _.isNull(value);
    });
  }

  static queryById(id) {
    return _queryMSSQLLikeById(id);
  }

  static delete(id) {
    return new Like({
      id: id
    }).delete();
  }
}

const LikePrototype = Like.prototype;

Object.defineProperty(LikePrototype, '_user', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(LikePrototype, 'userId', {
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

Object.defineProperty(LikePrototype, '_pin', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(LikePrototype, 'pinId', {
  get: function () {
    return this._pin && this._pin.id;
  },
  set: function (id) {
    if (this._pin) {
      this._pin.id = id;
    } else {
      this._pin = new BasePin({
        id: id
      });
    }
  },
  enumerable: true,
  configurable: false
});

function _upsert(likeIn, userId, pinId) {
  return _upsertMSSQL(likeIn, userId, pinId)
    .then(({
      like
    }) => {
      likeIn.set(like);
      return {
        like: likeIn
      };
    })
}

function _queryMSSQLLikeById(id) {
  return cp.getConnection()
    .then(conn => {
      //console.log("queryMSSQLPinById then err", err)
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'GetLike';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, id)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
            let like;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (res.recordset.length) {
              like = new Like(res.recordset[0]);
            } else {
              like = undefined;
            }
            resolve({
              like: like
            });
          });
      });
    }).catch(err => {
      // ... connect error checks
      console.log("queryMSSQLLikeById catch err", err);
      throw err;
    });
}

function _upsertMSSQL(like, userId, pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'CreateMergeLike';
        let request = new mssql.Request(conn)
          .input('like', mssql.Bit, like.like)
          .input('userId', mssql.Int, userId)
          .input('pinId', mssql.Int, pinId)
          .input('utcCreatedDateTime', mssql.DateTime2(7), like.utcCreatedDateTime)
          .input('utcUpdatedDateTime', mssql.DateTime2(7), like.utcUpdatedDateTime)
          .input('utcDeletedDateTime', mssql.DateTime2(7), like.utcDeletedDateTime)
          .output('id', mssql.Int);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let id;
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              like.id = res.output.id;

              //console.log('queryCount', queryCount);
            } catch (e) {
              throw e;
            }

            resolve({
              like: like
            });

          });
      });
    });
}

function _deleteMSSQL(like) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'DeleteLike';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, like.id)
          .output('utcDeletedDateTime', mssql.DateTime2(7));

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let utcDeletedDateTime;
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            try {
              //console.log('returnValue', returnValue); // always return 0
              utcDeletedDateTime = res.output.utcDeletedDateTime;
              //console.log('queryCount', queryCount);
            } catch (e) {
              console.log(`[dbo].[${StoredProcedureName}]`, e);
            }
            like.utcDeletedDateTime = utcDeletedDateTime;
            resolve({
              utcDeletedDateTime: utcDeletedDateTime,
              like: like
            });
          });
      });
    });
}

function _deleteByPinIdMSSQL(like) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'DeleteLikeByPinId';
        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, like.pinId)
          .input('userId', mssql.Int, like.userId)
          .output('utcDeletedDateTime', mssql.DateTime2(7));

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let utcDeletedDateTime;
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            try {
              //console.log('returnValue', returnValue); // always return 0
              utcDeletedDateTime = res.output.utcDeletedDateTime;
              //console.log('queryCount', queryCount);
            } catch (e) {
              console.log(`[dbo].[${StoredProcedureName}]`, e);
            }
            like.utcDeletedDateTime = utcDeletedDateTime;
            resolve({
              utcDeletedDateTime: utcDeletedDateTime,
              like: like
            });
          });
      });
    });
}
