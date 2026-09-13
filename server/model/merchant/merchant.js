'use strict';

import * as _ from 'lodash';
import * as db from '../../db';
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
    return _delete(this);
  }

  deleteByPinId() {
    return _deleteByPinId(this.pinId);
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
  return _upsertRow(merchantIn, pinId)
    .then(({
      merchant
    }) => {
      merchantIn.set(merchant);
      return {
        merchant: merchantIn
      };
    })
}

// Updates the merchant row with this id on this pin, or inserts a new row
// (with a new id) when there is none.
function _upsertRow(merchant, pinId) {
  const values = [merchant.label, merchant.url, merchant.price, pinId, merchant.id]
    .map(value => value === undefined ? null : value);
  return db.query(`
    WITH "updated" AS (
      UPDATE "Merchant"
      SET "label" = $1, "url" = $2, "price" = $3
      WHERE "pinId" = $4 AND "id" = $5
      RETURNING "id"
    ), "inserted" AS (
      INSERT INTO "Merchant" ("label", "url", "price", "pinId")
      SELECT $1, $2, $3, $4
      WHERE NOT EXISTS (SELECT 1 FROM "updated")
      RETURNING "id"
    )
    SELECT "id" FROM "updated"
    UNION ALL
    SELECT "id" FROM "inserted"`, values)
    .then(rows => {
      merchant.id = rows[0].id;
      return {
        merchant: merchant
      };
    });
}

function _delete(merchant) {
  return db.query(`DELETE FROM "Merchant" WHERE "id" = $1`, [merchant.id])
    .then(() => {
      return {
        merchant: merchant
      };
    });
}

function _deleteByPinId(pinId) {
  return db.query(`DELETE FROM "Merchant" WHERE "pinId" = $1`, [pinId])
    .then(() => {
      return {
        pinId: pinId
      };
    });
}
