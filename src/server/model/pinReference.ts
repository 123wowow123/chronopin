import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import BasePin from './basePin';

// addedByUserName/addedByUserPictureUrl are read from the view, never written.
const prop = [
  'id', 'url', 'title', 'confidence', 'publishedDate', 'startDate', 'endDate', 'reasoning', 'utcCreatedDateTime',
  'addedByUserId', 'addedByUserName', 'addedByUserPictureUrl',
];

export const REASONING_MAX = 2000;

// A further link backing up a pin, with how strongly it supports it (0-100).
export default class PinReference {
  [key: string]: any;
  declare _pin?: BasePin;
  declare id: number;
  declare pinId: number | undefined;
  declare url: string;
  declare addedByUserId: number | null | undefined;

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
      this.startDate || null,
      this.endDate || null,
      this.reasoning || null,
      this.utcCreatedDateTime || null,
      this.addedByUserId || null,
    ].map((value) => (value === undefined ? null : value));
    const rows = await db.query(
      `
      INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "publishedDate", "startDate", "endDate", "reasoning", "utcCreatedDateTime", "addedByUserId")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::timestamptz, now()), $10)
      RETURNING "id", "utcCreatedDateTime"`,
      values,
    );
    this.id = rows[0].id;
    this.utcCreatedDateTime = rows[0].utcCreatedDateTime;
    return { reference: this };
  }

  // Every reference of one pin in a single insert, in the order given - a
  // pin's references are saved together, and doing them one at a time was a
  // round trip each. The rows go in ORDER BY the ordinal, so the identity ids
  // ascend in that order and sorting what comes back by id lines it up with
  // the input again (RETURNING itself promises no order).
  static async saveAll(references: PinReference[]): Promise<PinReference[]> {
    if (!references.length) {
      return references;
    }
    const column = <T,>(read: (r: PinReference) => T) => references.map(read);
    const rows = await db.query<{ id: number; utcCreatedDateTime: Date }>(
      `
      INSERT INTO "PinReference" ("pinId", "url", "title", "confidence", "publishedDate", "startDate", "endDate", "reasoning", "utcCreatedDateTime", "addedByUserId")
      SELECT $1, "url", "title", "confidence", "publishedDate", "startDate", "endDate", "reasoning", COALESCE("utcCreatedDateTime", now()), "addedByUserId"
      FROM unnest($2::varchar[], $3::varchar[], $4::integer[], $5::date[], $6::date[], $7::date[], $8::varchar[], $9::timestamptz[], $10::integer[])
        WITH ORDINALITY AS "r" ("url", "title", "confidence", "publishedDate", "startDate", "endDate", "reasoning", "utcCreatedDateTime", "addedByUserId", "ord")
      ORDER BY "ord"
      RETURNING "id", "utcCreatedDateTime"`,
      [
        references[0].pinId,
        column((r) => r.url ?? null),
        column((r) => r.title ?? null),
        column((r) => r.confidence ?? null),
        column((r) => r.publishedDate || null),
        column((r) => r.startDate || null),
        column((r) => r.endDate || null),
        column((r) => r.reasoning || null),
        column((r) => r.utcCreatedDateTime || null),
        column((r) => r.addedByUserId ?? null),
      ],
    );
    rows.sort((a, b) => a.id - b.id);
    references.forEach((reference, i) => {
      reference.id = rows[i].id;
      reference.utcCreatedDateTime = rows[i].utcCreatedDateTime;
    });
    return references;
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
      for (const key of ['startDate', 'endDate']) {
        if (r[key] && !/^\d{4}-\d{2}-\d{2}$/.test(r[key])) {
          return `A reference ${key} must be YYYY-MM-DD.`;
        }
      }
      if (r.startDate && r.endDate && r.endDate < r.startDate) {
        return 'A reference endDate cannot be before its startDate.';
      }
      if (r.title && (typeof r.title !== 'string' || r.title.length > 1024)) {
        return 'A reference title must be at most 1024 characters.';
      }
      if (r.reasoning && (typeof r.reasoning !== 'string' || r.reasoning.length > REASONING_MAX)) {
        return `A reference reasoning must be at most ${REASONING_MAX} characters.`;
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
