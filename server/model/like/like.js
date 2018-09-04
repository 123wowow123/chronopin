'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import {
  User,
  Pin
} from '..';

// _user, userId, _pin, pinId
let prop = [
  'id',
  'like',
  'utcCreatedDateTime'
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

      if (user instanceof User) {
        this._user = user;
      }

      if (pin instanceof Pin) {
        this._pin = pin;
      }

    } else {
      throw "Like cannot set value of arg";
    }
    return this;
  }

  save() {
    return _createMSSQL(this, this.userId, this.pinId)
      .then(({
        like
      }) => {
        this.set(like);
        return {
          like: this
        };
      })
      .catch(err => {
        console.log(`Like '${this.id}' save err:`, err);
        throw err;
      });
  }

  // update() {
  //   return _updateMSSQL(this, this.userId);
  // }

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
  get: function() {
    return this._user && this._user.id;
  },
  set: function(id) {
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
  get: function() {
    return this._pin && this._pin.id;
  },
  set: function(id) {
    if (this._pin) {
      this._pin.id = id;
    } else {
      this._pin = new Pin({
        id: id
      });
    }
  },
  enumerable: true,
  configurable: false
});

function _queryMSSQLLikeById(id) {
  return cp.getConnection()
    .then(conn => {
      //console.log("queryMSSQLPinById then err", err)
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'GetLike';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, id)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, recordsets, returnValue, affected) => {
            let like;
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (recordsets[0].length) {
              like = new Like(recordsets[0] && recordsets[0][0]);
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

function _createMSSQL(like, userId, pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'CreateLike';
        let request = new mssql.Request(conn)
          .input('like', mssql.Bit, like.like)
          .input('userId', mssql.Int, like.userId)
          .input('pinId', mssql.Int, like.pinId)
          .input('utcCreatedDateTime', mssql.DateTime2(7), like.utcCreatedDateTime)
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
              like.id = request.parameters.id.value;

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

function _updateMSSQL(like) { // ToDo: not ready
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'UpdateLike';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, like.id)
          .input('like', mssql.Boolean, like.like);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, recordsets, returnValue, affected) => {
            //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // Todo: updated date time need to be updated on model
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
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'DeleteLike';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, like.id)
          .output('utcDeletedDateTime', mssql.DateTime2(7));

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, recordsets, returnValue, affected) => {
            let utcDeletedDateTime;
            //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            try {
              //console.log('returnValue', returnValue); // always return 0
              utcDeletedDateTime = request.parameters.utcDeletedDateTime.value;
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
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'DeleteLikeByPinId';
        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, like.pinId)
          .input('userId', mssql.Int, like.userId)
          .output('utcDeletedDateTime', mssql.DateTime2(7));

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, recordsets, returnValue, affected) => {
            let utcDeletedDateTime;
            //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            try {
              //console.log('returnValue', returnValue); // always return 0
              utcDeletedDateTime = request.parameters.utcDeletedDateTime.value;
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
