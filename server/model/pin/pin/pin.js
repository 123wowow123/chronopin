'use strict';

import * as mssql from 'mssql';
import * as cp from '../../../sqlConnectionPool';
import * as _ from 'lodash';
import * as sql from '../shared/sql'
import * as mapHelper from '../shared/helper'

import {
  BasePin,
  BasePinProp
} from '../..';

const prop = BasePinProp.concat(
  [
    'favoriteCount',
    'likeCount',
    'hasFavorite',
    'hasLike'
  ]
);

export default class Pin extends BasePin {

  constructor(pin, user) {
    super(pin, user, prop);
  }

  set(pin, user) {
    if (pin) {
      super.set(pin, user);

    } else {
      throw "Pin cannot set value of arg";
    }
    return this;
  }

  save() {
    return sql.createPinMSSQL(this, this.userId)
      .then(({
        pin
      }) => {
        //console.log('_createMSSQL', pin);
        let mediaPromise = this.media.map(medium => {
          return medium.createAndSaveToCDN();
        });

        return Promise.all(mediaPromise)
          .then((media) => {
            this.addMedia(media);
            return {
              pin: this
            };
          });
      })
      .catch(err => {
        console.log(`Pin '${this.title}' save err:`);
        console.log(`Pin '${this.id}' save err:`, err);
        throw err;
      });
  }

  update() {
    Pin.queryById(this.id, this.userId)
      .then(({
        beforePin
      }) => {
        let beforePinMedia = beforePin.media,
          newPinMedia = this.media,
          toSaveOriginalMedia = [],
          toDeleteOriginalMedia = [],
          toSaveMediaPromise = [],
          toDeleteMediaPromise = [];

        toSaveOriginalMedia = _difference(newPinMedia, beforePinMedia, 'originalUrl');
        toDeleteOriginalMedia = _difference(beforePinMedia, newPinMedia, 'originalUrl');

        toSaveMediaPromise = toSaveOriginalMedia.map(medium => {
          return medium.createAndSaveToCDN();
        })
          .then((newMedia) => {
            this.media = newMedia;
          });

        toDeleteMediaPromise = toSaveOriginalMedia.map(medium => {
          return medium.deleteFromPin();
        });

        return Promise.all([].concat(toSaveMediaPromise, toDeleteMediaPromise))
          .then(() => {
            return this;
          });
      });
    return _updateMSSQL(this, this.userId);
  }

  delete() {
    return _deleteMSSQL(this);
  }

  static queryById(pinId, userId) {
    if (userId) {
      return _queryMSSQLPinWithFavoriteAndLikeById(pinId, userId);
    } else {
      return _queryMSSQLPinById(pinId);
    }
  }

  static mapPinMedia(pinRows) {
    let pin = new Pin(pinRows[0]);
    pin.media = mapHelper.mapSubObjectFromQuery('Media', 'id', pinRows);
    return new Pin(pin);
  }
}

// Should move to Medium
function _difference(baseArray, otherArray, propName) {
  return baseArray.filter((obj) => {
    return !otherArray.find((otherObj) => {
      otherObj[propName] === obj[propName];
    });
  });
}

function _queryMSSQLPinWithFavoriteAndLikeById(pinId, userId) {
  return cp.getConnection()
    .then(conn => {
      //console.log("queryMSSQLPinById then err", err)
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'GetPinWithFavoriteAndLike';
        let pin;
        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, pinId)
          .input('userId', mssql.Int, userId)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (res.recordset.length) {
              pin = Pin.mapPinMedia(res.recordset);
            } else {
              pin = undefined;
            }
            resolve({
              pin: pin
            });
          });
      });
    }).catch(err => {
      // ... connect error checks
      console.log("queryMSSQLPinById catch err", err)
    });
}

function _queryMSSQLPinById(pinId) {
  return cp.getConnection()
    .then(conn => {
      //console.log("queryMSSQLPinById then err", err)
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'GetPin';
        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, pinId)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
            let pin;
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (res.recordset.length) {
              pin = Pin.mapPinMedia(res.recordset);
            } else {
              pin = undefined;
            }
            resolve({
              pin: pin
            });
          });
      });
    }).catch(err => {
      // ... connect error checks
      console.log("queryMSSQLPinById catch err", err);
      throw err;
    });
}

function _updateMSSQL(pin, userId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'UpdatePin';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, pin.id)
          .input('title', mssql.NVarChar(1024), pin.title)
          .input('description', mssql.NVarChar(4000), pin.description)
          .input('sourceUrl', mssql.NVarChar(4000), pin.sourceUrl)
          .input('address', mssql.NVarChar(4000), pin.address)
          .input('priceLowerBound', mssql.Decimal(18, 2), pin.priceLowerBound)
          .input('priceUpperBound', mssql.Decimal(18, 2), pin.priceUpperBound)
          .input('price', mssql.Decimal(18, 2), pin.price)
          .input('tip', mssql.NVarChar(4000), pin.tip)
          .input('utcStartDateTime', mssql.DateTime2(0), pin.utcStartDateTime)
          .input('utcEndDateTime', mssql.DateTime2(0), pin.utcEndDateTime)
          .input('allDay', mssql.Bit, pin.allDay)
          .input('userId', mssql.Int, userId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // Todo: updated date time need to be updated on model
            resolve({
              pin: pin
            });
          });
      });
    });
}

function _deleteMSSQL(pin) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'UpdatePin';
        let request = new mssql.Request(conn)
          .input('id', mssql.Int, pin.id)
          .output('utcDeletedDateTime', mssql.DateTime2(7));

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let utcDeletedDateTime;
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            try {
              //console.log('returnValue', returnValue); // always return 0
              utcDeletedDateTime = res.output.utcDeletedDateTime;
              //console.log('queryCount', queryCount);
            } catch (e) {
              console.log(`[dbo].[${StoredProcedureName}]`, e);
            }
            pin.utcDeletedDateTime = utcDeletedDateTime;
            resolve({
              utcDeletedDateTime: utcDeletedDateTime,
              pin: pin
            });
          });
      });
    });
}
