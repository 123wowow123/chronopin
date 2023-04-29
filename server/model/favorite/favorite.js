'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import * as _ from 'lodash';
import {
  User,
  BasePin
} from '..';

// _user, userId, _pin, pinId
let prop = [
  'id',
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  //'utcDeletedDateTime'
];

export default class Favorite {
  constructor(favorite, user, pin) {

    if (favorite) {
      this.set(favorite, user, pin);
    }
  }

  set(favorite, user, pin) {
    if (favorite) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = favorite[prop[i]];
      }

      if (user && user instanceof User) {
        this._user = user;
      }
      else if (favorite._user && favorite._user instanceof User) {
        this._user = favorite._user;
      }
      else if (Number.isInteger(favorite.userId)) {
        this.userId = favorite.userId;
      }

      if (pin instanceof BasePin) {
        this._pin = pin;
      }
      else if (favorite._pin && favorite._pin instanceof BasePin) {
        this._pin = favorite._pin;
      }
      else if (Number.isInteger(favorite.pinId)) {
        this.pinId = favorite.pinId;
      }

    } else {
      throw "Favorite cannot set value of arg";
    }
    return this;
  }

  save() {
    return _upsert(this, this.userId, this.pinId)
      .catch(err => {
        console.log(`Favorite '${this.id}' save err:`, err);
        throw err;
      });
  }

  update() {
    return _upsert(this, this.userId, this.pinId)
      .catch(err => {
        console.log(`Favorite '${this.id}' update err:`, err);
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
    return _queryMSSQLFavoriteById(id);
  }

  static delete(id) {
    return new Favorite({
      id: id
    }).delete();
  }
}

const FavoritePrototype = Favorite.prototype;

Object.defineProperty(FavoritePrototype, '_user', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(FavoritePrototype, 'userId', {
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

Object.defineProperty(FavoritePrototype, '_pin', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(FavoritePrototype, 'pinId', {
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

function _upsert(favoriteIn, userId, pinId) {
  return _upsertMSSQL(favorite, userId, pinId)
    .then(({
      favorite
    }) => {
      favoriteIn.set(favorite);
      return {
        favorite: favoriteIn
      };
    });
}

function _queryMSSQLFavoriteById(id) {
  return cp.getConnection()
    .then(conn => {
      //console.log("queryMSSQLPinById then err", err)
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'GetFavorite';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, id)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
            let favorite;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (res.recordset.length) {
              favorite = new Favorite(res.recordset[0]);
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

function _upsertMSSQL(favorite, userId, pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'CreateMergeFavorite';
        let request = new mssql.Request(conn)
          .input('utcCreatedDateTime', mssql.DateTime2(7), favorite.utcCreatedDateTime)
          .input('utcUpdatedDateTime', mssql.DateTime2(7), favorite.utcUpdatedDateTime)
          .input('utcDeletedDateTime', mssql.DateTime2(7), favorite.utcDeletedDateTime)
          .input('userId', mssql.Int, userId)
          .input('pinId', mssql.Int, pinId)
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
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'DeleteFavorite';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, favorite.id)
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
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'DeleteFavoriteByPinId';
        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, favorite.pinId)
          .input('userId', mssql.Int, favorite.userId)
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
            favorite.utcDeletedDateTime = utcDeletedDateTime;
            resolve({
              utcDeletedDateTime: utcDeletedDateTime,
              favorite: favorite
            });
          });
      });
    });
}
