'use strict';

import * as _ from 'lodash';
import rp from 'request-promise';

import {
    BasePin,
    BasePinProp
} from '../..';


// media
// favorites - will be converted to bool for client
// likes - will be converted to bool for client
const prop = BasePinProp.concat(
    [
        // 'userId', // not using defineProperty like Pin
    ]
);


export default class FullPin extends BasePin {

    constructor(pin, user) {
        super(pin, user, prop);
    }

    set(pin, user) {
        super.set(pin, user);

        if (pin) {
            this.favorites = _.get(pin, 'favorites', []).map(f => {
                return f;
            });

            this.likes = _.get(pin, 'likes', []).map(l => {
                return l;
            });

        } else {
            throw "FullPin cannot set value of arg";
        }
        return this;
    }

    save() {
        return _createFullMSSQL(this, this.userId);
    }

    static mapPinRowsToPin(pinRows) {
        let pin = new FullPin(pinRows[0]);
        pin.media = Pin.mapPinMedia(pinRows);
        pin.favorites = Pin.mapPinMedia(pinRows);
        pin.likes = Pin.mapPinLikes(pinRows);
        return pin;
    }

    static mapPinMedia(pinRows) {
        return _mapMediaFromQuery(pinRows);
    }

    static mapPinFavorites(pinRows) {
        return _mapValuesFromQuery('Favorites.userId', pinRows);
    }

    static mapPinLikes(pinRows) {
        return _mapValuesFromQuery('Likes.userId', pinRows);
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

function _mapValuesFromQuery(prefix, pinRows) {
    const aggregate = new Set();

    pinRows.forEach(pinRow => {

        Object.entries(pinRow)
            .filter(([key, value]) => {
                return key.startsWith(prefix); //'Likes.'
            })
            .forEach(([key, value]) => {
                aggregate.add(value);
            });

    });

    return aggregate.size
        ? [...aggregate]
        : undefined;
}

function _createFullMSSQL(pin, userId) {
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