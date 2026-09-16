import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import BasePin from './basePin';

const prop = ['id', 'source', 'score', 'scoreMax', 'url', 'utcCreatedDateTime'];

export const SOURCE_MAX = 64;
export const URL_MAX = 4000;

// A third-party rating for a pin (IMDb, Rotten Tomatoes, MyAnimeList, ...),
// in that source's own scale. Populated by scraping, never by the edit form:
// Pin#update() deliberately does not touch this table (see 0017's schema
// comment), so a rating stays put across ordinary edits.
export default class PinRating {
  [key: string]: any;
  declare _pin?: BasePin;
  declare id: number;
  declare pinId: number | undefined;
  declare source: string;
  declare score: number;
  declare scoreMax: number;

  constructor(rating?: Row | null, pin?: BasePin | null) {
    if (rating) {
      this.set(rating, pin);
    }
  }

  set(rating: Row, pin?: BasePin | null): this {
    if (!rating) {
      throw new Error('PinRating cannot set value of arg');
    }
    for (const key of prop) {
      this[key] = rating[key];
    }

    if (pin instanceof BasePin) {
      this._pin = pin;
    } else if (rating._pin && rating._pin instanceof BasePin) {
      this._pin = rating._pin;
    } else if (Number.isInteger(rating.pinId)) {
      this.pinId = rating.pinId;
    }
    return this;
  }

  // Insert-or-refresh: a rescrape replaces this source's score for the pin
  // rather than piling up a new row.
  async save() {
    const values = [this.pinId, this.source, this.score, this.scoreMax ?? 10, this.url || null].map((value) =>
      value === undefined ? null : value,
    );
    const rows = await db.query(
      `
      INSERT INTO "PinRating" ("pinId", "source", "score", "scoreMax", "url")
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT ("pinId", "source") DO UPDATE SET
        "score" = EXCLUDED."score",
        "scoreMax" = EXCLUDED."scoreMax",
        "url" = EXCLUDED."url"
      RETURNING "id", "utcCreatedDateTime"`,
      values,
    );
    this.id = rows[0].id;
    this.utcCreatedDateTime = rows[0].utcCreatedDateTime;
    return { rating: this };
  }

  // Every rating of one pin in a single insert. Matched back by source, which
  // is unique per pin: an upsert that refreshes an existing source keeps that
  // row's id, so the ids do not follow the order given the way an insert's do.
  static async saveAll(ratings: PinRating[]): Promise<PinRating[]> {
    if (!ratings.length) {
      return ratings;
    }
    const column = <T,>(read: (r: PinRating) => T) => ratings.map(read);
    const rows = await db.query<{ id: number; source: string; utcCreatedDateTime: Date }>(
      `
      INSERT INTO "PinRating" ("pinId", "source", "score", "scoreMax", "url")
      SELECT $1, "source", "score", COALESCE("scoreMax", 10), "url"
      FROM unnest($2::varchar[], $3::numeric[], $4::numeric[], $5::varchar[]) AS "r" ("source", "score", "scoreMax", "url")
      ON CONFLICT ("pinId", "source") DO UPDATE SET
        "score" = EXCLUDED."score",
        "scoreMax" = EXCLUDED."scoreMax",
        "url" = EXCLUDED."url"
      RETURNING "id", "source", "utcCreatedDateTime"`,
      [
        ratings[0].pinId,
        column((r) => r.source ?? null),
        column((r) => r.score ?? null),
        column((r) => r.scoreMax ?? null),
        column((r) => r.url || null),
      ],
    );
    const bySource = new Map(rows.map((row) => [row.source, row]));
    ratings.forEach((rating) => {
      const row = bySource.get(rating.source);
      if (row) {
        rating.id = row.id;
        rating.utcCreatedDateTime = row.utcCreatedDateTime;
      }
    });
    return ratings;
  }

  setPin(pin: BasePin): this {
    this._pin = pin;
    return this;
  }

  toJSON(): Row {
    return _.omitBy(this, (value, key) => key.startsWith('_') || _.isNull(value));
  }

  // Why these ratings cannot be saved, if they cannot.
  static problem(ratings: Row[]): string | undefined {
    for (const r of ratings) {
      if (typeof r.source !== 'string' || !r.source.trim() || r.source.length > SOURCE_MAX) {
        return `A rating source must be at most ${SOURCE_MAX} characters.`;
      }
      if (typeof r.score !== 'number' || !Number.isFinite(r.score) || r.score < 0) {
        return 'A rating score must be a non-negative number.';
      }
      if (r.scoreMax != null && (typeof r.scoreMax !== 'number' || !Number.isFinite(r.scoreMax) || r.scoreMax <= 0)) {
        return 'A rating scoreMax must be a positive number.';
      }
      if (r.scoreMax != null && r.score > r.scoreMax) {
        return 'A rating score cannot exceed its scoreMax.';
      }
      if (r.url && (typeof r.url !== 'string' || !/^https?:\/\//i.test(r.url) || r.url.length > URL_MAX)) {
        return 'A rating url must be an http(s) url.';
      }
    }
    return undefined;
  }

  static async deleteByPinId(pinId: number) {
    await db.query(`DELETE FROM "PinRating" WHERE "pinId" = $1`, [pinId]);
    return { pinId };
  }
}

// pinId reads through to the pin, so a rating built before its pin was saved
// picks up the pin's new id. Enumerable, so it is part of the JSON.
Object.defineProperty(PinRating.prototype, 'pinId', {
  get(this: PinRating) {
    return this._pin && this._pin.id;
  },
  set(this: PinRating, id: number) {
    if (this._pin) {
      this._pin.id = id;
    } else {
      this._pin = new BasePin({ id });
    }
  },
  enumerable: true,
  configurable: false,
});
