'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import * as _ from 'lodash';
import {
  User,
  Pin
} from '../../model';

// _user, userId, _pin, pinId
let prop = [
  'id',
  'utcCreatedDateTime'
];

export default class Favorite {
  constructor(favorite, user, pin) {
    Object.defineProperty(this, '_user', {
      enumerable: false,
      configurable: false,
      writable: true
    });

    Object.defineProperty(this, 'userId', {
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

    Object.defineProperty(this, '_pin', {
      enumerable: false,
      configurable: false,
      writable: true
    });

    Object.defineProperty(this, 'pinId', {
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

    if (favorite) {
      this.set(favorite, user, pin);
    }
  }

  set(favorite, user, pin) {
    if (favorite) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = favorite[prop[i]];
      }

      if (user instanceof User) {
        this._user = user;
      }

      if (pin instanceof Pin) {
        this._pin = pin;
      }

    } else {
      throw "Favorite cannot set value of arg";
    }
    return this;
  }

  save() {
    return _createMSSQL(this, this.userId, this.pinId)
      .then(({
        favorite
      }) => {
        this.set(favorite);
        return {
          favorite: this
        };
      })
      .catch(err => {
        console.log(`Favorite '${this.id}' save err:`, err);
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
    return _queryMSSQLFavoriteById(id);
  }

  static delete(id) {
    return new Favorite({
      id: id
    }).delete();
  }
}

function _queryMSSQLFavoriteById(id) {
  return cp.getConnection()
    .then(conn => {
      //console.log("queryMSSQLPinById then err", err)
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'GetFavorite';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, id)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, recordsets, returnValue, affected) => {
            let favorite;
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (recordsets[0].length) {
              favorite = new Favorite(recordsets[0] && recordsets[0][0]);
            } else {
              favorite = undefined;
            }
            resolve({
              favorite: favorite
            });
          });
      });
    }).catch(err => {
      // ... connect error checks
      console.log("queryMSSQLFavoriteById catch err", err);
      throw err;
    });
}

function _createMSSQL(favorite, userId, pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'CreateFavorite';
        let request = new mssql.Request(conn)
          .input('utcCreatedDateTime', mssql.DateTime2(7), favorite.utcCreatedDateTime)
          .input('userId', mssql.Int, favorite.userId)
          .input('pinId', mssql.Int, favorite.pinId)
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
              favorite.id = request.parameters.id.value;

              //console.log('queryCount', queryCount);
            } catch (e) {
              throw e;
            }

            resolve({
              favorite: favorite
            });

          });
      });
    });
}

function _deleteMSSQL(favorite) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'DeleteFavorite';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, favorite.id)
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
            favorite.utcDeletedDateTime = utcDeletedDateTime;
            resolve({
              utcDeletedDateTime: utcDeletedDateTime,
              favorite: favorite
            });
          });
      });
    });
}

function _deleteByPinIdMSSQL(favorite) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function(resolve, reject) {
        const StoredProcedureName = 'DeleteFavoriteByPinId';
        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, favorite.pinId)
          .input('userId', mssql.Int, favorite.userId)
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
            favorite.utcDeletedDateTime = utcDeletedDateTime;
            resolve({
              utcDeletedDateTime: utcDeletedDateTime,
              favorite: favorite
            });
          });
      });
    });
}
