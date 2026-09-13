'use strict';

import * as db from '../../db';
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
          return _createPinMedium(this, this._pin.id)
            .then(newMedium => {
              return this.set(newMedium);
            });
        } else {
          if (_.get(this, "_pin.id")) {
            return _createPinMediumLink(this, this._pin.id);
          } else {
            return _create(this);
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
    return _deleteFromPin(this, this._pin.id);
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
    return _getByOriginalUrl(originalUrl);
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

const MEDIUM_COLUMNS = ['thumbName', 'thumbWidth', 'thumbHeight', 'originalUrl', 'originalWidth',
  'originalHeight', 'type', 'authorName', 'authorUrl', 'html'];

function _mediumValues(medium) {
  return MEDIUM_COLUMNS.map(c => medium[c] === undefined ? null : medium[c]);
}

const MEDIUM_INSERT = `
  INSERT INTO "Medium" (${MEDIUM_COLUMNS.map(c => `"${c}"`).join(', ')})
  VALUES (${MEDIUM_COLUMNS.map((c, i) => `$${i + 1}`).join(', ')})
  RETURNING "id"`;

// Creates the medium and links it to the pin in one statement, so a medium is
// never left without its link. Resolves the medium with its new id.
function _createPinMediumLink(medium, pinId) {
  const values = _mediumValues(medium).concat([
    pinId,
    medium.utcCreatedDateTime || new Date(),
    medium.utcDeletedDateTime === undefined ? null : medium.utcDeletedDateTime
  ]);
  const n = MEDIUM_COLUMNS.length;
  return db.query(`
    WITH "medium" AS (${MEDIUM_INSERT}),
    "link" AS (
      INSERT INTO "PinMedium" ("pinId", "mediumId", "utcCreatedDateTime", "utcDeletedDateTime")
      SELECT $${n + 1}, "medium"."id", $${n + 2}, $${n + 3} FROM "medium"
    )
    SELECT "id" FROM "medium"`, values)
    .then(rows => {
      medium.id = rows[0].id;
      return medium;
    });
}

function _create(medium) {
  return db.query(MEDIUM_INSERT, _mediumValues(medium))
    .then(rows => {
      medium.id = rows[0].id;
      return medium;
    });
}

// Links an existing medium to a pin.
function _createPinMedium(medium, pinId) {
  return db.query(`
    INSERT INTO "PinMedium" ("pinId", "mediumId", "utcCreatedDateTime", "utcDeletedDateTime")
    VALUES ($1, $2, $3, $4)`,
    [pinId, medium.id, medium.utcCreatedDateTime || new Date(),
      medium.utcDeletedDateTime === undefined ? null : medium.utcDeletedDateTime])
    .then(() => {
      return {
        medium: medium
      };
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

// Removes the link and the medium row itself (not the file on the CDN).
function _deleteFromPin(medium, pinId) {
  const utcDeletedDateTime = new Date();
  return db.transaction(query => query(
      `DELETE FROM "PinMedium" WHERE "pinId" = $1 AND "mediumId" = $2`, [pinId, medium.id])
    .then(() => query(`DELETE FROM "Medium" WHERE "id" = $1`, [medium.id])))
    .then(() => {
      return {
        utcDeletedDateTime: utcDeletedDateTime,
        medium: medium
      };
    });
}

function _getByOriginalUrl(originalUrl) {
  return db.query(`
    SELECT "id", ${MEDIUM_COLUMNS.map(c => `"${c}"`).join(', ')}
    FROM "Medium"
    WHERE "originalUrl" = $1`, [originalUrl])
    .then(rows => {
      return {
        medium: rows.length ? new Medium(rows[0]) : undefined
      };
    });
}
