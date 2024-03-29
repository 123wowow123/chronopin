'use strict';

import * as mssql from 'mssql';
import * as cp from '../../sqlConnectionPool';
import * as image from '../../image'
import * as _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
  BasePin
} from '..';

// _pin
const prop = [
  'id',
  'thumbName',
  'thumbWidth',
  'thumbHeight',
  'originalUrl',
  'originalWidth',
  'originalHeight',
  'type',
  'utcCreatedDateTime',
  'utcDeletedDateTime',
  // For twitter and youtube
  'authorName',
  'authorUrl',
  'html'
];

export default class Medium {
  constructor(medium, pin) {

    if (medium) {
      this.set(medium, pin);
    }
  }

  set(medium, pin) {
    if (medium) {
      for (let i = 0; i < prop.length; i++) {
        this[prop[i]] = medium[prop[i]];
      }

      if (pin instanceof BasePin) {
        this._pin = pin;
      }
      else if (medium._pin && medium._pin instanceof BasePin) {
        this._pin = medium._pin;
      }
      else if (Number.isInteger(medium.pinId)) {
        this.pinId = medium.pinId;
      }

    } else {
      throw "medium cannot set value of arg";
    }

    return this;
  }

  save() {
    return Medium.getByOriginalUrl(this.originalUrl)
      .then(({
        medium
      }) => {
        if (_.get(medium, "_pin.id")) {
          // share existing Medium to save thumb space and better analytics
          // no modification needed and just reuse db medium;
          this.set(medium);
          return _createPinMediumMSSQL(this, this._pin.id)
            .then(newMedium => {
              return this.set(newMedium);
            });
        } else {
          if (_.get(this, "_pin.id")) {
            return _createPinMediumLinkMSSQL(this, this._pin.id);
          } else {
            return _createMSSQL(this);
          }
        }
      });
  }

  createAndSaveToCDN() {
    return _getImageStatAndSaveImage(this.originalUrl)
      .then(newMedium => {
        // console.log('createAndSaveToCDN', newMedium);
        return this
          .set(newMedium)
          .save();
      });
  }

  deleteFromPin() {
    return _deleteFromPinMSSQL(this, this._pin.id);
  }

  setPin(pin) {
    this._pin = pin;
    return this;
  }

  toJSON() {
    // omits own and inherited properties with null values
    return _.omitBy(this, (value, key) => {
      return key.startsWith('_')
        || _.isNull(value);
    });
  }

  static getByOriginalUrl(originalUrl) {
    return _getMediumByOriginalUrlMSSQL(originalUrl);
  }

  static createAndSaveToCDN(originalUrl) {
    return new Medium({
      originalUrl: originalUrl
    })
      .createAndSaveToCDN();
  }

  static createAndSaveToCDNFromLocalPath(localPath) {
    return _getImageStatAndSaveImageFromLocalPath(localPath);
  }

  static isValid(localPath) {
    return !!medium.originalUrl;
  }

}

const MediumPrototype = Medium.prototype;

Object.defineProperty(MediumPrototype, '_pin', {
  enumerable: false,
  configurable: false,
  writable: true
});

function _createPinMediumLinkMSSQL(medium, pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'CreatePinMediumLink';
        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, pinId)
          .input('thumbName', mssql.NVarChar(4000), medium.thumbName)
          .input('thumbWidth', mssql.Int, medium.thumbWidth)
          .input('thumbHeight', mssql.Int, medium.thumbHeight)
          .input('originalUrl', mssql.NVarChar(4000), medium.originalUrl)
          .input('originalWidth', mssql.Int, medium.originalWidth)
          .input('originalHeight', mssql.Int, medium.originalHeight)
          .input('type', mssql.Int, medium.type)
          .input('utcCreatedDateTime', mssql.DateTime2(7), medium.utcCreatedDateTime)
          .input('utcDeletedDateTime', mssql.DateTime2(7), medium.utcDeletedDateTime)
          .input('authorName', mssql.NVarChar(1028), medium.authorName)
          .input('authorUrl', mssql.NVarChar(4000), medium.authorUrl)
          .input('html', mssql.NVarChar(4000), medium.html)

          .output('id', mssql.Int);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let queryCount, id;
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              id = res.output.id;
              //console.log('queryCount', queryCount);
            } catch (e) {
              id = 0;
            }
            medium.id = id;
            resolve(medium);
          });
      });
    });
}

function _createMSSQL(medium) {
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'CreateMedium';
        let request = new mssql.Request(conn)
          .input('thumbName', mssql.NVarChar(4000), medium.thumbName)
          .input('thumbWidth', mssql.Int, medium.thumbWidth)
          .input('thumbHeight', mssql.Int, medium.thumbHeight)
          .input('originalUrl', mssql.NVarChar(4000), medium.originalUrl)
          .input('originalWidth', mssql.Int, medium.originalWidth)
          .input('originalHeight', mssql.Int, medium.originalHeight)
          .input('type', mssql.Int, medium.type)
          .input('authorName', mssql.NVarChar(1028), medium.authorName)
          .input('authorUrl', mssql.NVarChar(4000), medium.authorUrl)
          .input('html', mssql.NVarChar(4000), medium.html)

          .output('id', mssql.Int);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let queryCount, id;
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              id = res.output.id;
              //console.log('queryCount', queryCount);
            } catch (e) {
              id = 0;
            }
            medium.id = id;
            resolve(medium);
          });
      });
    });
}

function _createPinMediumMSSQL(medium, pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise((resolve, reject) => {
        const StoredProcedureName = 'CreatePinMedium';

        let request = new mssql.Request(conn)
          .input('pinId', mssql.Int, pinId)
          .input('mediumId', mssql.Int, medium.id)
          .input('utcCreatedDateTime', mssql.DateTime2(7), medium.utcCreatedDateTime)
          .input('utcDeletedDateTime', mssql.DateTime2(7), medium.utcDeletedDateTime)
          .output('id', mssql.Int);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let queryCount, id;
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }

            resolve({
              medium: medium
            });
          });
      });
    });
}

function _mapAndSaveThumb(thumbBufferAndMeta) {
  let thumbNameGuid = uuidv4();
  let newMedium = {
    buffer: thumbBufferAndMeta.buffer,
    thumbName: thumbNameGuid + thumbBufferAndMeta.extention,
    thumbWidth: thumbBufferAndMeta.thumbWidth,
    thumbHeight: thumbBufferAndMeta.thumbHeight,

    originalUrl: thumbBufferAndMeta.originalUrl,
    originalWidth: thumbBufferAndMeta.originalWidth,
    originalHeight: thumbBufferAndMeta.originalHeight,
    mimeType: thumbBufferAndMeta.type,
    type: 1 // 1 for 'Image'
  };
  return image.saveThumb(newMedium);
}

function _getImageStatAndSaveImageFromLocalPath(localPath) {
  return image.createThumbFromLocalPath(localPath)
    .then(_mapAndSaveThumb);
}

function _getImageStatAndSaveImage(imageUrl) {
  return image.createThumbFromUrl(imageUrl)
    .then(_mapAndSaveThumb);
}

function _deleteFromPinMSSQL(medium, pinId) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'DeletePinMediumByPinMediumId';
        let request = new mssql.Request(conn)
          // fb public attributes
          .input('pinId', mssql.Int, pinId)
          .input('mediumId', mssql.Int, medium.id)
          .output('utcDeletedDateTime', mssql.DateTime2(7));

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            let utcDeletedDateTime;
            //console.log('GetPinsWithFavoriteAndLikeNext', res.recordset);
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            // ToDo: doesn't always return value
            try {
              //console.log('returnValue', returnValue); // always return 0
              utcDeletedDateTime = res.output.utcDeletedDateTime;
              //console.log('queryCount', queryCount);
            } catch (e) {
              console.log(`[dbo].[${StoredProcedureName}]`, e);
            }
            return resolve({
              utcDeletedDateTime: utcDeletedDateTime,
              medium: medium
            });
          });
      });
    });
}

function _getMediumByOriginalUrlMSSQL(originalUrl) {
  return cp.getConnection()
    .then(conn => {
      return new Promise(function (resolve, reject) {
        const StoredProcedureName = 'GetMediumByOriginalUrl';
        let medium;
        let request = new mssql.Request(conn)
          .input('originalUrl', mssql.NVarChar, originalUrl);

        //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

        request.execute(`[dbo].[${StoredProcedureName}]`,
          (err, res, returnValue, affected) => {
            if (err) {
              return reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
            }
            if (res.recordset.length) {
              medium = new Medium(res.recordset[0]);
            } else {
              medium = undefined;
            }
            return resolve({
              medium: medium
            });
          });
      });
    });
}
