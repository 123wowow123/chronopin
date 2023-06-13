'use strict';

import * as mssql from 'mssql';
import * as cp from '../../../sqlConnectionPool';
import * as _ from 'lodash';
import * as sql from '../shared/sql'
import * as mapHelper from '../shared/helper'

import {
  BasePin,
  BasePinProp,
  Merchant,
  Location,
  Mention
} from '../..';

const prop = BasePinProp.concat(
  [
    'favoriteCount',
    'likeCount',
    'hasFavorite',
    'hasLike',
    'reverseOrder'
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
        console.log('saving', JSON.stringify(pin.id));
        const mediaPromise = this.media
          .filter(m => m.type === 1)
          .map(m => {
            return m.createAndSaveToCDN();
          });

        const mediaNonImagePromise = this.media
          .filter(m => m.type !== 1)
          .map(m => {
            return m.save();
          });

        const merchantsPromise = this.merchants
          .map(m => {
            return m.save();
          });

        const locationsPromise = this.locations
          .map(m => {
            return m.save();
          });

        const mentionsPromise = this.mentions
          .map(m => {
            return m.save();
          });

        const allMediaPromise = Promise.all(
          mediaPromise.concat(mediaNonImagePromise)
        )
          .then((media) => {
            this.addMedia(media);
            return {
              pin: this
            };
          });

        const allMerchantsPromise = Promise.all(
          merchantsPromise
        )
          .then((merchants) => {
            this.addMerchants(merchants);
            return {
              pin: this
            };
          });

        const allLocationsPromise = Promise.all(
          locationsPromise
        )
          .then((locations) => {
            this.addLocations(locations);
            return {
              pin: this
            };
          });

        const allMentionsPromise = Promise.all(
          mentionsPromise
        )
          .then((mentions) => {
            this.addMentions(mentions);
            return {
              pin: this
            };
          });

        return Promise.all([allMediaPromise, allMerchantsPromise, allLocationsPromise, allMentionsPromise])
          .then((results) => {
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

  update(updatingUser) {
    return Pin.queryByIdForEdit(this.id)
      .then((res) => {
        // TODO: Add to auth middleware
        if (res.pin.userId !== updatingUser.userId && updatingUser.role !== 'admin') throw "Unauthorized update";
        this.userId = res.pin.userId;

        let beforePinMedia = res.pin.media,
          // originalUserId = beforePinMedia,
          newPinMedia = this.media,
          newPinMerchants = this.merchants,
          newPinLocations = this.locations,
          newPinMentions = this.mentions;

        let toSaveOriginalMedia = _difference(newPinMedia, beforePinMedia, 'originalUrl');
        let toDeleteOriginalMedia = _difference(beforePinMedia, newPinMedia, 'originalUrl');

        const allMerchantPromise = Merchant.deleteByPinId(this.id)
          .then(() => {
            return Promise.all(
              newPinMerchants
                .map(m => {
                  return m.save();
                })
            ).then((merchants) => {
              this.addMerchants(merchants);
            });
          });

        const allLocationPromise = Location.deleteByPinId(this.id)
          .then(() => {
            return Promise.all(
              newPinLocations
                .map(m => {
                  return m.save();
                })
            ).then((locations) => {
              this.addLocations(locations);
            });
          });

        const allMentionPromise = Mention.deleteByPinId(this.id)
          .then(() => {
            return Promise.all(
              newPinMentions
                .map(m => {
                  return m.save();
                })
            ).then((mentions) => {
              this.addMentions(mentions);
            });
          });

        const toSaveMediaPromise = Promise.all(
          toSaveOriginalMedia.map(medium => {
            return medium.createAndSaveToCDN();
          }))
          .then((newMedia) => {
            this.media = newMedia;
          });

        const toDeleteMediaPromise = Promise.all(
          toDeleteOriginalMedia.map(medium => {
            return medium.deleteFromPin(); // TODO: Need to delete from CDN
          })
        );

        return Promise.all([
          toSaveMediaPromise,
          toDeleteMediaPromise,
          allMerchantPromise,
          allLocationPromise,
          allMentionPromise
        ]).then(() => {
          return this;
        });
      })
      .then((pin) => {
        return _updateMSSQL(pin, pin.userId);
      });
  }

  delete() {
    return _deleteMSSQL(this);
  }

  // toJSON() {
  //   return super.toJSON();
  // }

  static queryByIdForEdit(pinId) {
    return _queryMSSQLPinByIdForEdit(pinId);
  }

  static queryById(pinId, userId) {
    if (userId) {
      return _queryMSSQLPinWithFavoriteAndLikeById(pinId, userId);
    } else {
      return _queryMSSQLPinById(pinId);
    }
  }

  static mapPinJoins(pin, pinRows) {
    pin = Pin.mapPinMedia(pin, pinRows);
    pin = Pin.mapPinMerchants(pin, pinRows);
    pin = Pin.mapPinLocations(pin, pinRows);
    pin = Pin.mapPinMentions(pin, pinRows);
    return pin;
  }

  static mapPinMedia(pin, pinRows) {
    pin.addMedia(mapHelper.mapSubObjectFromQuery('Media', 'id', pinRows));
    return pin;
  }

  static mapPinMerchants(pin, pinRows) {
    pin.addMerchants(mapHelper.mapSubObjectFromQuery('Merchant', 'id', pinRows));
    return pin;
  }

  static mapPinLocations(pin, pinRows) {
    pin.addLocations(mapHelper.mapSubObjectFromQuery('Location', 'id', pinRows));
    return pin;
  }

  static mapPinMentions(pin, pinRows) {
    pin.addMentions(mapHelper.mapSubObjectFromQuery('Mention', 'id', pinRows));
    return pin;
  }
}

// Should move to Medium
function _difference(baseArray, otherArray, propName) {
  return baseArray.filter((obj) => {
    return !otherArray.find((otherObj) => {
      return otherObj[propName] === obj[propName];
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
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (res.recordset.length) {
              pin = new Pin(res.recordset[0]);
              pin = Pin.mapPinJoins(pin, res.recordset);
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
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (res.recordset.length) {
              pin = new Pin(res.recordset[0]);
              pin = Pin.mapPinJoins(pin, res.recordset);
              // pin = Pin.mapPinUser(pin, res.recordset[0]);
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

function _queryMSSQLPinByIdForEdit(pinId) {
  return cp.getConnection()
    .then(conn => {
      //console.log("queryMSSQLPinById then err", err)
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'GetPinForEdit';
        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, pinId)
          .execute(`[dbo].[${StoredProcedureName}]`, (err, res, returnValue, affected) => {
            let pin;
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (res.recordset.length) {
              pin = new Pin(res.recordset[0]);
              pin = Pin.mapPinJoins(pin, res.recordset);
              // pin = Pin.mapPinUser(pin, res.recordset[0]);
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
          .input('parentId', mssql.Int, pin.parentId)
          .input('title', mssql.NVarChar(1024), pin.title)
          .input('description', mssql.NVarChar(mssql.MAX), pin.description)
          .input('sourceDescription', mssql.NVarChar(mssql.MAX), pin.sourceDescription)
          .input('sourceUrl', mssql.NVarChar(4000), pin.sourceUrl)
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
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
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
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
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
