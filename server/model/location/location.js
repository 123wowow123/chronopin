'use strict';

import * as _ from 'lodash';
import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import {
  BasePin
} from '..';

//_pin, pinId
let prop = [
  'id',
  'address'
];

export default class Location {
  constructor(location, pin) {
    if (location) {
      this.set(location, pin);
    }
  }

  set(location, pin) {
    if (location) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = location[prop[i]];
      }

      if (pin instanceof BasePin) {
        this._pin = pin;
      }
      else if (location._pin && location._pin instanceof BasePin) {
        this._pin = location._pin;
      }
      else if (Number.isInteger(location.pinId)) {
        this.pinId = location.pinId;
      }

    } else {
      throw "Location cannot set value of arg";
    }
    return this;
  }

  save() {
    return _upsert(this, this.pinId)
      .catch(err => {
        console.log(`Location '${this.id}' save err:`, err);
        throw err;
      });
  }

  update() {
    return _upsert(this, this.pinId)
      .catch(err => {
        console.log(`Location '${this.id}' update err:`, err);
        throw err;
      });
  }

  delete() {
    return _deleteMSSQL(this);
  }

  deleteByPinId() {
    return _deleteByPinIdMSSQL(this.pinId);
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

  static deleteByPinId(pinId) {
    return new Location({
      pinId: pinId
    }).deleteByPinId();
  }

  static delete(id) {
    return new Location({
      id: id
    }).delete();
  }
}

const LocationPrototype = Location.prototype;

Object.defineProperty(LocationPrototype, '_pin', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(LocationPrototype, 'pinId', {
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

function _upsert(locationIn, pinId) {
  return _upsertMSSQL(locationIn, pinId)
    .then(({
      location
    }) => {
      locationIn.set(location);
      return {
        location: locationIn
      };
    })
}

function _upsertMSSQL(location, pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'CreateMergeLocation';
        let request = new mssql.Request(conn)
          .input('address', mssql.NVarChar(2000), location.address)
          .input('pinId', mssql.Int, pinId)
          .output('id', mssql.Int, location.id);

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
              location.id = res.output.id;

              //console.log('queryCount', queryCount);
            } catch (e) {
              throw e;
            }

            resolve({
              location
            });

          });
      });
    });
}

function _deleteMSSQL(location) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'DeleteLocation';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, location.id);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            resolve({
              location
            });
          });
      });
    });
}

function _deleteByPinIdMSSQL(pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'DeleteLocationByPinId';
        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, pinId);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }

            return resolve({
              pinId
            });
          });
      });
    });
}
