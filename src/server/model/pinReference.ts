import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import BasePin from './basePin';

const prop = ['id', 'url', 'title', 'confidence', 'publishedDate', 'utcCreatedDateTime'];

// A further link backing up a pin, with how strongly it supports it (0-100).
export default class PinReference {
  [key: string]: any;
  declare _pin?: BasePin;
  declare id: number;
  declare pinId: number | undefined;

  constructor(reference?: Row | null, pin?: BasePin | null) {
    if (reference) {
      this.set(reference, pin);
    }
  }

  set(reference: Row, pin?: BasePin | null): this {
    if (!reference) {
      throw new Error('PinReference cannot set value of arg');
    }
    for (const key of prop) {
      this[key] = reference[key];
    }

    if (pin instanceof BasePin) {
      this._pin = pin;
    } else if (reference._pin && reference._pin instanceof BasePin) {
      this._pin = reference._pin;
    } else if (Number.isInteger(reference.pinId)) {
      this.pinId = reference.pinId;
    }
    return this;
  }

  // Always inserts: a pin's references are deleted and re-saved together.
  async save() {
    const values = [
      this.pinId,
      this.url,
      this.title,
      this.confidence,
      this.publishedDate || null,
      this.utcCreatedDateTime || null,
    ].map((value) => (value === undefined ? null : value));
    const rows = await db.query(
      `
      INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "publishedDate", "utcCreatedDateTime")
      VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))
      RETURNING "id", "utcCreatedDateTime"`,
      values,
    );
    this.id = rows[0].id;
    this.utcCreatedDateTime = rows[0].utcCreatedDateTime;
    return { reference: this };
  }

  setPin(pin: BasePin): this {
    this._pin = pin;
    return this;
  }

  toJSON(): Row {
    return _.omitBy(this, (value, key) => key.startsWith('_') || _.isNull(value));
  }

  // Why these references cannot be saved, if they cannot. Checked before a
  // pin is written: the save deletes a pin's old references first.
  static problem(references: Row[]): string | undefined {
    for (const r of references) {
      if (typeof r.url !== 'string' || !/^https?:\/\//i.test(r.url) || r.url.length > 4000) {
        return 'A reference needs an http(s) url.';
      }
      if (!Number.isInteger(r.confidence) || r.confidence < 0 || r.confidence > 100) {
        return 'A reference confidence must be a whole number from 0 to 100.';
      }
      if (r.publishedDate && !/^\d{4}-\d{2}-\d{2}$/.test(r.publishedDate)) {
        return 'A reference publishedDate must be YYYY-MM-DD.';
      }
      if (r.title && (typeof r.title !== 'string' || r.title.length > 1024)) {
        return 'A reference title must be at most 1024 characters.';
      }
    }
    return undefined;
  }

  static async deleteByPinId(pinId: number) {
    await db.query(`DELETE FROM "PinReference" WHERE "pinId" = $1`, [pinId]);
    return { pinId };
  }
}

// pinId reads through to the pin, so a reference built before its pin was
// saved picks up the pin's new id. Enumerable, so it is part of the JSON.
Object.defineProperty(PinReference.prototype, 'pinId', {
  get(this: PinReference) {
    return this._pin && this._pin.id;
  },
  set(this: PinReference, id: number) {
    if (this._pin) {
      this._pin.id = id;
    } else {
      this._pin = new BasePin({ id });
    }
  },
  enumerable: true,
  configurable: false,
});
