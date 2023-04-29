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
  'label',
  'url',
  'price'
];

export default class Merchant {
  constructor(merchant, pin) {
    if (merchant) {
      this.set(merchant, pin);
    }
  }

  set(merchant, pin) {
    if (merchant) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = merchant[prop[i]];
      }

      if (pin instanceof BasePin) {
        this._pin = pin;
      }
      else if (merchant._pin && merchant._pin instanceof BasePin) {
        this._pin = merchant._pin;
      }
      else if (Number.isInteger(merchant.pinId)) {
        this.pinId = merchant.pinId;
      }

    } else {
      throw "Merchant cannot set value of arg";
    }
    return this;
  }

  save() {
    return _upsert(this, this.pinId)
      .catch(err => {
        console.log(`Merchant '${this.id}' save err:`, err);
        throw err;
      });
  }

  update() {
    return _upsert(this, this.pinId)
      .catch(err => {
        console.log(`Merchant '${this.id}' update err:`, err);
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
    return new Merchant({
      pinId: pinId
    }).deleteByPinId();
  }

  static delete(id) {
    return new Merchant({
      id: id
    }).delete();
  }
}

const MerchantPrototype = Merchant.prototype;

Object.defineProperty(MerchantPrototype, '_pin', {
  enumerable: false,
  configurable: false,
  writable: true
});

Object.defineProperty(MerchantPrototype, 'pinId', {
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

function _upsert(merchantIn, pinId) {
  return _upsertMSSQL(merchantIn, pinId)
    .then(({
      merchant
    }) => {
      merchantIn.set(merchant);
      return {
        merchant: merchantIn
      };
    })
}

function _upsertMSSQL(merchant, pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'CreateMergeMerchant';
        let request = new mssql.Request(conn)
          .input('url', mssql.NVarChar(1024), merchant.url)
          .input('label', mssql.NVarChar(1024), merchant.label)
          .input('price', mssql.Decimal(18, 2), merchant.price)
          .input('pinId', mssql.Int, pinId)
          .output('id', mssql.Int, merchant.id);

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
              merchant.id = res.output.id;

              //console.log('queryCount', queryCount);
            } catch (e) {
              throw e;
            }

            resolve({
              merchant
            });

          });
      });
    });
}

function _deleteMSSQL(merchant) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'DeleteMerchant';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, merchant.id);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            resolve({
              merchant
            });
          });
      });
    });
}

function _deleteByPinIdMSSQL(pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'DeleteMerchantByPinId';
        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, pinId);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }

            resolve({
              pinId
            });
          });
      });
    });
}
