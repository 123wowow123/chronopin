import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import BasePin from './basePin';

const prop = ['id', 'label', 'url', 'price'];

// A place to buy what a pin is about (Amazon, Best Buy...).
export default class Merchant {
  [key: string]: any;
  declare _pin?: BasePin;
  declare id: number;
  declare pinId: number | undefined;

  constructor(merchant?: Row | null, pin?: BasePin | null) {
    if (merchant) {
      this.set(merchant, pin);
    }
  }

  set(merchant: Row, pin?: BasePin | null): this {
    if (!merchant) {
      throw new Error('Merchant cannot set value of arg');
    }
    for (const key of prop) {
      this[key] = merchant[key];
    }

    if (pin instanceof BasePin) {
      this._pin = pin;
    } else if (merchant._pin && merchant._pin instanceof BasePin) {
      this._pin = merchant._pin;
    } else if (Number.isInteger(merchant.pinId)) {
      this.pinId = merchant.pinId;
    }
    return this;
  }

  async save() {
    try {
      return await upsert(this, this.pinId);
    } catch (err) {
      console.log(`Merchant '${this.id}' save err:`, err);
      throw err;
    }
  }

  update() {
    return this.save();
  }

  async delete() {
    await db.query(`DELETE FROM "Merchant" WHERE "id" = $1`, [this.id]);
    return { merchant: this };
  }

  setPin(pin: BasePin): this {
    this._pin = pin;
    return this;
  }

  toJSON(): Row {
    return _.omitBy(this, (value, key) => key.startsWith('_') || _.isNull(value));
  }

  static async deleteByPinId(pinId: number) {
    await db.query(`DELETE FROM "Merchant" WHERE "pinId" = $1`, [pinId]);
    return { pinId };
  }

  static delete(id: number) {
    return new Merchant({ id }).delete();
  }
}

// pinId reads through to the pin, so a merchant built before its pin was
// saved picks up the pin's new id. Enumerable, so it is part of the JSON.
Object.defineProperty(Merchant.prototype, 'pinId', {
  get(this: Merchant) {
    return this._pin && this._pin.id;
  },
  set(this: Merchant, id: number) {
    if (this._pin) {
      this._pin.id = id;
    } else {
      this._pin = new BasePin({ id });
    }
  },
  enumerable: true,
  configurable: false,
});

// Updates the merchant row with this id on this pin, or inserts a new row
// (with a new id) when there is none.
async function upsert(merchant: Merchant, pinId: number | undefined) {
  const values = [merchant.label, merchant.url, merchant.price, pinId, merchant.id].map((value) =>
    value === undefined ? null : value,
  );
  const rows = await db.query(
    `
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
    SELECT "id" FROM "inserted"`,
    values,
  );
  merchant.id = rows[0].id;
  return { merchant };
}
