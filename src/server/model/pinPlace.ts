import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import BasePin from './basePin';

const prop = [
  'id',
  'googlePlaceId',
  'yelpBusinessId',
  'reservationUrl',
  'reservationProvider',
  'resolvedBy',
  // The scraped half (0060): read from Google Maps by places:refresh, stored
  // because the read costs a browser and cannot happen on a page view.
  'googleRating',
  'googleRatingCount',
  'googleHours',
  'googleName',
  'checkedAt',
  'utcCreatedDateTime',
  'utcUpdatedDateTime',
];

export const ID_MAX = 255;
export const URL_MAX = 4000;
export const PROVIDER_MAX = 64;

// Where a pin's place is on Google and Yelp, and how to book a table there.
// Identifiers only - the scores themselves are fetched on view and never
// stored (see 0059's schema comment). Like PinRating, Pin#update() does not
// touch this table, so editing a pin cannot wipe it.
export default class PinPlace {
  [key: string]: any;
  declare _pin?: BasePin;
  declare id: number;
  declare pinId: number | undefined;
  declare googlePlaceId?: string | null;
  declare yelpBusinessId?: string | null;
  declare reservationUrl?: string | null;
  declare reservationProvider?: string | null;
  declare resolvedBy?: 'auto' | 'hand';

  constructor(place?: Row | null, pin?: BasePin | null) {
    if (place) {
      this.set(place, pin);
    }
  }

  set(place: Row, pin?: BasePin | null): this {
    if (!place) {
      throw new Error('PinPlace cannot set value of arg');
    }
    for (const key of prop) {
      this[key] = place[key];
    }

    if (pin instanceof BasePin) {
      this._pin = pin;
    } else if (place._pin && place._pin instanceof BasePin) {
      this._pin = place._pin;
    } else if (Number.isInteger(place.pinId)) {
      this.pinId = place.pinId;
    }
    return this;
  }

  // Insert-or-refresh, one row per pin. A row a person resolved by hand is
  // never overwritten by an automatic rescan: the script cannot tell that a
  // chain's Times Square branch is not the pin's Brooklyn one, and a person
  // who checked already has.
  // Writes only the handles. The scraped columns are left alone, so
  // places:resolve re-running cannot wipe a rating that places:refresh read
  // (the same separation Pin#update keeps from PinRating).
  async save() {
    const values = [
      this.pinId,
      this.googlePlaceId || null,
      this.yelpBusinessId || null,
      this.reservationUrl || null,
      this.reservationProvider || null,
      this.resolvedBy || 'auto',
    ].map((value) => (value === undefined ? null : value));

    const rows = await db.query(
      `
      INSERT INTO "PinPlace"
        ("pinId", "googlePlaceId", "yelpBusinessId", "reservationUrl", "reservationProvider", "resolvedBy")
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT ("pinId") DO UPDATE SET
        "googlePlaceId"       = EXCLUDED."googlePlaceId",
        "yelpBusinessId"      = EXCLUDED."yelpBusinessId",
        "reservationUrl"      = EXCLUDED."reservationUrl",
        "reservationProvider" = EXCLUDED."reservationProvider",
        "resolvedBy"          = EXCLUDED."resolvedBy",
        "utcUpdatedDateTime"  = now()
      WHERE "PinPlace"."resolvedBy" = 'auto' OR EXCLUDED."resolvedBy" = 'hand'
      RETURNING "id"`,
      values,
    );
    // No row back means the WHERE above refused the update: a hand-resolved
    // row stood in the way. Keep the one that is already there.
    if (rows[0]) {
      this.id = rows[0].id;
    }
    return { pinPlace: this };
  }

  update() {
    return this.save();
  }

  async delete() {
    await db.query(`DELETE FROM "PinPlace" WHERE "id" = $1`, [this.id]);
    return { pinPlace: this };
  }

  setPin(pin: BasePin): this {
    this._pin = pin;
    return this;
  }

  toJSON(): Row {
    return _.omitBy(this, (value, key) => key.startsWith('_') || _.isNull(value));
  }

  // What is wrong with this row, or null. Mirrors PinRating.problem, so the
  // routes and the resolve script reject the same things.
  static problem(place: Row | null | undefined): string | null {
    if (!place || typeof place !== 'object') {
      return 'place must be an object';
    }
    const { googlePlaceId, yelpBusinessId, reservationUrl, reservationProvider } = place;
    for (const [name, value, max] of [
      ['googlePlaceId', googlePlaceId, ID_MAX],
      ['yelpBusinessId', yelpBusinessId, ID_MAX],
      ['reservationUrl', reservationUrl, URL_MAX],
      ['reservationProvider', reservationProvider, PROVIDER_MAX],
    ] as const) {
      if (value != null && typeof value !== 'string') {
        return `${name} must be a string`;
      }
      if (typeof value === 'string' && value.length > max) {
        return `${name} must be at most ${max} characters`;
      }
    }
    if (!googlePlaceId && !yelpBusinessId && !reservationUrl) {
      return 'place needs a googlePlaceId, a yelpBusinessId or a reservationUrl';
    }
    if (typeof reservationUrl === 'string' && reservationUrl && !/^https:\/\//i.test(reservationUrl)) {
      return 'reservationUrl must be an https URL';
    }
    return null;
  }

  // Stores what the Maps scrape read, with the time it was read. Only ever
  // called by places:refresh; a null rating is recorded too, so an unrated
  // place is not re-scraped every run.
  //
  // The count never shrinks and the name is COALESCEd, because **Google serves
  // the rating count unreliably** - not just intermittently, but sometimes
  // wrong. The same place read three times gave 685, 685, then 42, and a
  // straight overwrite knocked Ferrari World from 61,367 down to 538. A
  // review count only rises in practice, so the stored one is the GREATEST
  // seen: that neutralises the flaky renders completely, at the cost of not
  // following a genuine decrease (reviews being deleted), which is the right
  // trade for a number shown next to a rating.
  //
  // The rating and the hours always come from the fresh read: those are what
  // the scrape is for, they were stable across every check, and a stale one is
  // worse than none.
  static async setScraped(
    pinId: number,
    scraped: {
      rating?: number | null;
      ratingCount?: number | null;
      hours?: string | null;
      name?: string | null;
      // When the read happened. A live scrape leaves this out and gets now();
      // a seed restore passes the ORIGINAL time, so month-old opening hours
      // are not handed back looking fresh.
      checkedAt?: Date | string | null;
    } = {},
  ) {
    await db.query(
      `
      UPDATE "PinPlace" SET
        "googleRating"      = $2,
        -- Every branch casts $3: without a cast on each one Postgres cannot
        -- infer the parameter's type inside a CASE and the whole statement
        -- fails with "could not determine data type of parameter $3".
        "googleRatingCount" = CASE
          WHEN $3::integer IS NULL THEN "PinPlace"."googleRatingCount"
          WHEN "PinPlace"."googleRatingCount" IS NULL THEN $3::integer
          ELSE GREATEST($3::integer, "PinPlace"."googleRatingCount")
        END,
        "googleHours"       = $4,
        "googleName"        = COALESCE($5, "googleName"),
        "checkedAt"         = COALESCE($6::timestamptz, now())
      WHERE "pinId" = $1`,
      [
        pinId,
        scraped.rating ?? null,
        scraped.ratingCount ?? null,
        scraped.hours ?? null,
        scraped.name ?? null,
        scraped.checkedAt ?? null,
      ],
    );
    return { pinId };
  }

  // Places with a Google id whose scrape is missing or older than `hours`,
  // stalest first. What places:refresh works through.
  static staleGoogle(hours = 24, limit = 200): Promise<Row[]> {
    return db.query(
      `
      SELECT "pp"."pinId", "pp"."googlePlaceId", "pp"."googleName", "pp"."googleRating", "pp"."checkedAt", "p"."title"
      FROM "PinPlace" AS "pp"
        JOIN "Pin" AS "p" ON "p"."id" = "pp"."pinId" AND "p"."utcDeletedDateTime" IS NULL
      WHERE "pp"."googlePlaceId" IS NOT NULL
        AND ("pp"."checkedAt" IS NULL OR "pp"."checkedAt" < now() - ($1 || ' hours')::interval)
      ORDER BY "pp"."checkedAt" NULLS FIRST
      LIMIT $2`,
      [String(hours), limit],
    );
  }

  static async byPinId(pinId: number): Promise<PinPlace | null> {
    const rows = await db.query(`SELECT * FROM "PinPlace" WHERE "pinId" = $1`, [pinId]);
    return rows[0] ? new PinPlace(rows[0]) : null;
  }

  static async deleteByPinId(pinId: number) {
    await db.query(`DELETE FROM "PinPlace" WHERE "pinId" = $1`, [pinId]);
    return { pinId };
  }
}

// pinId reads through to the pin, as Merchant's does, so a place built before
// its pin was saved picks up the pin's new id.
Object.defineProperty(PinPlace.prototype, 'pinId', {
  get(this: PinPlace) {
    return this._pin && this._pin.id;
  },
  set(this: PinPlace, id: number) {
    if (this._pin) {
      this._pin.id = id;
    } else {
      this._pin = new BasePin({ id });
    }
  },
  enumerable: true,
  configurable: false,
});

export type StoredPinPlace = {
  pinId: number;
  googlePlaceId: string | null;
  yelpBusinessId: string | null;
  reservationUrl: string | null;
  reservationProvider: string | null;
  resolvedBy: string;
  // The scraped half travels with the handles, so a db:refresh comes back with
  // ratings already showing instead of needing a five-second browser visit per
  // place first. "checkedAt" goes with them and is restored as it was, not as
  // now(): that is what keeps an old reading honest, because the API drops a
  // scraped opening state once it is over an hour old (see places.ts) while
  // still showing the rating.
  googleRating: number | string | null;
  googleRatingCount: number | null;
  googleHours: string | null;
  googleName: string | null;
  checkedAt: string | Date | null;
};

// Every resolved place, for the seed backup. These are not derivable: a
// Google place id costs a billed search to find again, and a booking link is
// someone's own work, so unlike awards or tags they cannot simply be rebuilt
// by a script after a db:refresh.
export function allPlaces(): Promise<StoredPinPlace[]> {
  return db.query<StoredPinPlace>(
    `SELECT "pinId", "googlePlaceId", "yelpBusinessId", "reservationUrl", "reservationProvider", "resolvedBy",
            "googleRating", "googleRatingCount", "googleHours", "googleName", "checkedAt"
     FROM "PinPlace" ORDER BY "pinId"`,
  );
}

// Puts backed-up places back, for pins that exist (ones the seed left out are
// skipped), keeping whether each was resolved by hand.
export async function restorePlaces(places: StoredPinPlace[]): Promise<void> {
  for (const place of places) {
    const [pin] = await db.query(`SELECT 1 FROM "Pin" WHERE "id" = $1`, [place.pinId]);
    if (!pin) {
      continue;
    }
    // The handles first (save writes only those), then the scraped half with
    // its own original read time.
    await new PinPlace(place).save();
    if (place.googleRating != null || place.googleName) {
      await PinPlace.setScraped(place.pinId, {
        rating: place.googleRating == null ? null : Number(place.googleRating),
        ratingCount: place.googleRatingCount,
        hours: place.googleHours,
        name: place.googleName,
        checkedAt: place.checkedAt,
      });
    }
  }
}
