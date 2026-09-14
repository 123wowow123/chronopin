'use strict';

import * as db from '../../../db';
import * as _ from 'lodash';
import * as sql from '../shared/sql'
import * as mapHelper from '../shared/helper'

import {
  BasePin,
  BasePinProp,
  Company,
  Merchant
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
    return sql.createPin(this, this.userId)
      .then(({
        pin
      }) => {
        //console.log('_createMSSQL', pin);
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

        const allMediaPromise = Promise.all(
          mediaPromise.concat(mediaNonImagePromise)
        )
          .then((media) => {
            this.addMedia(media);
            return {
              pin: this
            };
          });

        const allMerchantPromise = Promise.all(
          merchantsPromise
        )
          .then((merchants) => {
            this.addMerchants(merchants);
            return {
              pin: this
            };
          });

        return Promise.all([allMediaPromise, allMerchantPromise])
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

  update() {
    return Pin.queryById(this.id, this.userId)
      .then((res) => {

        // Who may update is decided in pin.controller.js (_canModify), the
        // only caller.
        let beforePinMedia = res.pin.media,
          // originalUserId = beforePinMedia,
          newPinMedia = this.media,
          newPinMerchants = this.merchants

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
          allMerchantPromise
        ]).then(() => {
          return this;
        });
      })
      .then((pin) => Company.applyToPin(pin))
      .then((pin) => {
        return _update(pin, pin.userId);
      });
  }

  delete() {
    return _delete(this);
  }

  // toJSON() {
  //   return super.toJSON();
  // }

  static queryById(pinId, userId) {
    if (userId) {
      return _queryById(pinId, userId);
    } else {
      return _queryById(pinId, null);
    }
  }

  // Persists a generated longFormSummary without going through the full
  // client-driven update() path, which requires a request-scoped userId.
  static updateLongFormSummary(pinId, longFormSummary) {
    return _updateLongFormSummary(pinId, longFormSummary);
  }

  static mapPinJoins(pin, pinRows) {
    pin = Pin.mapPinMedia(pin, pinRows);
    pin = Pin.mapPinMerchants(pin, pinRows);
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
}

// Should move to Medium
function _difference(baseArray, otherArray, propName) {
  return baseArray.filter((obj) => {
    return !otherArray.find((otherObj) => {
      return otherObj[propName] === obj[propName];
    });
  });
}

// userId, when given, adds whether that user watches and likes the pin.
// Resolves { pin: undefined } for a missing or deleted pin.
function _queryById(pinId, userId) {
  const viewerColumns = userId ? `,
      EXISTS (SELECT 1 FROM "Favorite" AS "f"
              WHERE "f"."userId" = $2 AND "f"."pinId" = "Pin"."id" AND "f"."utcDeletedDateTime" IS NULL) AS "hasFavorite",
      EXISTS (SELECT 1 FROM "Like" AS "l"
              WHERE "l"."userId" = $2 AND "l"."pinId" = "Pin"."id" AND "l"."utcDeletedDateTime" IS NULL) AS "hasLike"` : '';
  return db.query(`
    SELECT "Pin".*${viewerColumns}
    FROM "PinBaseView" AS "Pin"
    WHERE "Pin"."id" = $1 AND "Pin"."utcDeletedDateTime" IS NULL
    ORDER BY "Pin"."Media.id", "Pin"."Merchant.id"`,
    userId ? [pinId, userId] : [pinId])
    .then(rows => {
      let pin;
      if (rows.length) {
        pin = new Pin(rows[0]);
        pin = Pin.mapPinJoins(pin, rows);
      }
      return {
        pin: pin
      };
    })
    .catch(err => {
      console.log("Pin queryById err", err);
      throw err;
    });
}

function _update(pin, userId) {
  const values = [
    pin.id, pin.parentId, pin.title, pin.description, pin.sourceUrl, pin.longFormSummary,
    pin.dateConfidence, pin.dateConfidenceReasoning, pin.companyId,
    pin.category, pin.address, pin.priceLowerBound, pin.priceUpperBound, pin.price,
    pin.priceCurrency, pin.tip, pin.utcStartDateTime, pin.utcEndDateTime, pin.allDay,
    userId, pin.latitude, pin.longitude
  ].map(value => value === undefined ? null : value);

  // Every column is written, so a field missing from the pin is cleared - the
  // edit form sends the whole pin for this reason.
  return db.query(`
    UPDATE "Pin"
    SET
      "parentId" = $2,
      "title" = $3,
      "description" = $4,
      "sourceUrl" = $5,
      "longFormSummary" = $6,
      "dateConfidence" = $7,
      "dateConfidenceReasoning" = $8,
      "companyId" = $9,
      "category" = $10,
      "address" = $11,
      "priceLowerBound" = $12,
      "priceUpperBound" = $13,
      "price" = $14,
      "priceCurrency" = $15,
      "tip" = $16,
      "utcStartDateTime" = $17,
      "utcEndDateTime" = $18,
      "allDay" = $19,
      "userId" = $20,
      "location" = ${sql.locationSql('$21', '$22')},
      "utcUpdatedDateTime" = now()
    WHERE "id" = $1`, values)
    .then(() => {
      // Todo: updated date time need to be updated on model
      return {
        pin: pin
      };
    });
}

function _updateLongFormSummary(pinId, longFormSummary) {
  return db.query(
    `UPDATE "Pin" SET "longFormSummary" = $2, "utcUpdatedDateTime" = now() WHERE "id" = $1`,
    [pinId, longFormSummary])
    .then(() => {
      return {
        pinId: pinId,
        longFormSummary: longFormSummary
      };
    });
}

// A soft delete: the row stays, marked with when it was deleted.
function _delete(pin) {
  return db.query(
    `UPDATE "Pin" SET "utcDeletedDateTime" = now() WHERE "id" = $1 RETURNING "utcDeletedDateTime"`,
    [pin.id])
    .then(rows => {
      const utcDeletedDateTime = rows.length ? rows[0].utcDeletedDateTime : undefined;
      pin.utcDeletedDateTime = utcDeletedDateTime;
      return {
        utcDeletedDateTime: utcDeletedDateTime,
        pin: pin
      };
    });
}
