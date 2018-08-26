'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import * as _ from 'lodash';
import {
  Medium,
  User
} from '..';

// _user, userId, media
let prop = [
  'id',
  'title',
  'description',
  'sourceUrl',
  'address',
  'priceLowerBound',
  'priceUpperBound',
  'price',
  'tip',
  'utcStartDateTime',
  'utcEndDateTime',
  'allDay',
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
  'utcDeletedDateTime',

  'favoriteCount',
  'likeCount',
  'hasFavorite',
  'hasLike',
  //'searchScore'
];

function _difference(baseArray, otherArray, propName) {
  return baseArray.filter((obj) => {
    return !otherArray.find((otherObj) => {
      otherObj[propName] === obj[propName];
    });
  });
}

export default class Pin {
  constructor(pin, user) {
    Object.defineProperty(this, '_user', {
      enumerable: false,
      configurable: false,
      writable: true
    });

    Object.defineProperty(this, 'userId', {
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

    this.media = [];

    if (pin) {
      this.set(pin, user);
    }
  }

  set(pin, user) {
    if (pin) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = pin[prop[i]];
      }
      this.media = pin.media && pin.media.map(m => {
        return new Medium(m, this);
      }) || [];

      if (user instanceof User) {
        this._user = user;
      }

    } else {
      throw "Pin cannot set value of arg";
    }
    return this;
  }

  save() {
    return _createMSSQL(this, this.userId)
      .then(({
        pin
      }) => {
        //console.log('_createMSSQL', pin);
        let mediaPromise;
        if (this.media && this.media.length) {
          mediaPromise = this.media.map(medium => {
            return medium.createAndSaveToCDN();
          });
        } else {
          mediaPromise = ['resolved'];
        }
        return Promise.all(mediaPromise)
          .then(() => {
            this.set(pin);
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
    let beforePin = Pin.queryById(this.id, this.userId)
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

  setUser(user) {
    this._user = user;
    this.userId = user.id;
    return this;
  }

  addMedium(medium) {
    if (medium instanceof Medium) {
      medium.setPin(this);
      this.media.push(medium);
    } else {
      throw "medium not instance of Medium";
    }
    return this;
  }

  toJSON() {
    // omits own and inherited properties with null values
    return _.omitBy(this, _.isNull);
  }

  static queryById(pinId, userId) {
    if (userId) {
      return _queryMSSQLPinWithFavoriteAndLikeById(pinId, userId);
    } else {
      return _queryMSSQLPinById(pinId);
    }
  }

  static delete(id) {
    return new Pin({
      id: id
    }).delete();
  }

  static mapPinMedia(pinRows) {
    let media,
      pin = new Pin(pinRows[0]);
    if ((media = _mapMediaFromQuery(pinRows))) {
      pin.media = media;
    }
    return new Pin(pin);
  }
}

function _mapMediaFromQuery(pinRows) {
  const media = [];

  pinRows.forEach(pinRow => {
    const mediaObj = {}
    let hasProp;

    Object.entries(pinRow)
      .filter(([key, value]) => {
        return key.startsWith('Media.');
      })
      .forEach(([key, value]) => {
        mediaObj[key.substring(6)] = value;
        hasProp = true;
      });

    if (hasProp && Medium.isValid(mediaObj)) {
      media.push(mediaObj);
    }
  });

  return media.length
    ? media
    : undefined;
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
          .execute(`[dbo].[${StoredProcedureName}]`, (err, recordsets, returnValue, affected) => {
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (recordsets[0].length) {
              pin = Pin.mapPinMedia(recordsets[0]);
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
          .execute(`[dbo].[${StoredProcedureName}]`, (err, recordsets, returnValue, affected) => {
            let pin;
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (recordsets[0].length) {
              pin = Pin.mapPinMedia(recordsets[0]);
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

function _createMSSQL(pin, userId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'CreatePin';
        let request = new mssql.Request(conn)
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
          .input('userId', mssql.Int, userId)
          .input('utcCreatedDateTime', mssql.DateTime2(7), pin.utcCreatedDateTime)
          .input('utcUpdatedDateTime', mssql.DateTime2(7), pin.utcUpdatedDateTime)
          .input('utcDeletedDateTime', mssql.DateTime2(7), pin.utcDeletedDateTime)
          .output('id', mssql.Int, pin.id);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, recordsets, returnValue, affected) => {
            let id;
            if (err) {
              reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              pin.id = request.parameters.id.value;

              //console.log('queryCount', queryCount);
            } catch (e) {
              throw e;
            }

            resolve({
              pin: pin
            });

          });
      });
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
          (err, recordsets, returnValue, affected) => {
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
          (err, recordsets, returnValue, affected) => {
            let utcDeletedDateTime;
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
            pin.utcDeletedDateTime = utcDeletedDateTime;
            resolve({
              utcDeletedDateTime: utcDeletedDateTime,
              pin: pin
            });
          });
      });
    });
}
