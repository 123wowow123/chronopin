import * as db from '../db';
import type { QueryFn, Row } from '../db';
import BasePin, { BasePinProp } from './basePin';
import Company from './company';
import { saveAllToPin } from './medium';
import Merchant from './merchant';
import PinRating from './pinRating';
import PinReference from './pinReference';
import type User from './user';
import { createPin, locationSql, mapSubObjectFromQuery, normalizeAllDayDates } from './pinShared';

const prop = BasePinProp.concat(['favoriteCount', 'likeCount', 'viewCount', 'impressionCount', 'duplicateGroup', 'hasFavorite', 'hasLike', 'reverseOrder']);

export default class Pin extends BasePin {
  constructor(pin?: Row | null, user?: User | null) {
    super(pin, user, prop);
  }

  async save(): Promise<{ pin: Pin }> {
    try {
      await createPin(this, this.userId);

      // Each medium and merchant saves in place, picking up its new id. (The
      // Express version re-added the saved copies, so the create response
      // listed every medium and merchant twice.)
      // Media keep their own path: each one fetches and uploads a thumb, which
      // is what a new pin's time actually goes on, so they run together.
      const mediaSaved = Promise.all(this.media.map((m) => m.saveWithThumb()));
      // The rest go a statement each, in the order the form lists them.
      await Merchant.saveAll(this.merchants, this.id);
      await PinReference.saveAll(this.references);
      await PinRating.saveAll(this.ratings || []);
      await mediaSaved;
      return { pin: this };
    } catch (err) {
      console.log(`Pin '${this.title}' save err:`);
      console.log(`Pin '${this.id}' save err:`, err);
      throw err;
    }
  }

  // Who may update is decided by the caller (canModify in the pins route).
  // Ratings are deliberately not part of this: they are not on the edit
  // form, so this.ratings is always empty on a PUT and replacing them
  // wholesale here would wipe every rating the first time anyone edited the
  // pin (the same bug merchants once had - see setRatings for how a
  // rescrape refreshes them instead).
  async update(): Promise<{ pin: Pin }> {
    const res = await Pin.queryById(this.id, this.userId);
    const beforePinMedia = res.pin?.media ?? [];
    const newPinMedia = this.media;
    const newPinMerchants = this.merchants;
    const newPinReferences = this.references;

    const toSaveOriginalMedia = difference(newPinMedia, beforePinMedia, 'originalUrl');
    const toDeleteOriginalMedia = difference(beforePinMedia, newPinMedia, 'originalUrl');

    // The slow parts go first, outside the transaction: fetching and uploading
    // new media's thumbs (a failure writes nothing), and the company, whose
    // logo lookup runs in the background and must find its row committed.
    await Promise.all(toSaveOriginalMedia.map((medium) => medium.addThumb()));
    await Company.applyToPin(this);

    // Then everything else in one transaction, the pin row first. These used
    // to run on their own before it, so a pin the database refused (a PUT
    // without a title) still lost its merchants, references and media.
    await db.transaction(async (query) => {
      await updatePinRow(this, this.userId, query);
      // Merchants and references are replaced wholesale; each saves with a new
      // id, and a reference keeps the utcCreatedDateTime it came with.
      await Merchant.deleteByPinId(this.id, query);
      await Merchant.saveAll(newPinMerchants, this.id, query);
      await PinReference.deleteByPinId(this.id, query);
      await PinReference.saveAll(newPinReferences, query);
      // Removes the link and row; the file stays on the CDN.
      for (const medium of toDeleteOriginalMedia) {
        await medium.deleteFromPin(query);
      }
      await saveAllToPin(toSaveOriginalMedia, this.id, query);
    });
    return { pin: this };
  }

  delete() {
    return deletePinRow(this);
  }

  static queryById(pinId: number, userId?: number | null): Promise<{ pin: Pin | undefined }> {
    return queryPinById(pinId, userId || null);
  }

  // A live pin by userId with this sourceUrl, other than exceptPinId. http and
  // https count as the same URL.
  static async findBySourceUrl(userId: number | null, sourceUrl: string | null | undefined, exceptPinId?: number | null) {
    const url = sameSourceUrlKey(sourceUrl);
    if (!url || userId == null) {
      return undefined;
    }
    const rows = await db.query<{ id: number; title: string }>(
      `SELECT "id", "title" FROM "Pin"
       WHERE "userId" = $1 AND regexp_replace(btrim("sourceUrl"), '^https?://', '', 'i') = $2
         AND "utcDeletedDateTime" IS NULL AND "id" <> $3
       ORDER BY "id" LIMIT 1`,
      [userId, url, exceptPinId ?? 0],
    );
    return rows[0];
  }

  // Persists a generated longFormSummary without going through the full
  // edit path, which needs the author.
  static async updateLongFormSummary(pinId: number, longFormSummary: string) {
    await db.query(`UPDATE "Pin" SET "longFormSummary" = $2, "utcUpdatedDateTime" = now() WHERE "id" = $1`, [
      pinId,
      longFormSummary,
    ]);
    return { pinId, longFormSummary };
  }

  // How a scrape/backfill refreshes a pin's ratings, outside the edit form
  // path: upserts each given rating (by source) and, when replace is true,
  // deletes any existing source not present in ratings.
  static async setRatings(pinId: number, ratings: Row[], { replace = false }: { replace?: boolean } = {}) {
    if (replace) {
      const keep = new Set(ratings.map((r) => r.source));
      const existing = await db.query<{ source: string }>(`SELECT "source" FROM "PinRating" WHERE "pinId" = $1`, [pinId]);
      const toRemove = existing.filter((r) => !keep.has(r.source)).map((r) => r.source);
      if (toRemove.length) {
        await db.query(`DELETE FROM "PinRating" WHERE "pinId" = $1 AND "source" = ANY($2::text[])`, [pinId, toRemove]);
      }
    }
    await PinRating.saveAll(ratings.map((r) => new PinRating(r, new BasePin({ id: pinId }))));
    return { pinId };
  }

  static mapPinJoins(pin: Pin, pinRows: Row[]): Pin {
    pin.addMedia(mapSubObjectFromQuery('Media', 'id', pinRows));
    pin.addMerchants(mapSubObjectFromQuery('Merchant', 'id', pinRows));
    return pin;
  }
}

function difference<T extends Row>(baseArray: T[], otherArray: T[], propName: string): T[] {
  return baseArray.filter((obj) => !otherArray.find((otherObj) => otherObj[propName] === obj[propName]));
}

// userId, when given, adds whether that user watches and likes the pin.
// Resolves { pin: undefined } for a missing or deleted pin.
async function queryPinById(pinId: number, userId: number | null) {
  const viewerColumns = userId
    ? `,
      EXISTS (SELECT 1 FROM "Favorite" AS "f"
              WHERE "f"."userId" = $2 AND "f"."pinId" = "Pin"."id" AND "f"."utcDeletedDateTime" IS NULL) AS "hasFavorite",
      EXISTS (SELECT 1 FROM "Like" AS "l"
              WHERE "l"."userId" = $2 AND "l"."pinId" = "Pin"."id" AND "l"."utcDeletedDateTime" IS NULL) AS "hasLike"`
    : '';
  try {
    const rows = await db.query(
      `
    SELECT "Pin".*${viewerColumns}
    FROM "PinBaseView" AS "Pin"
    WHERE "Pin"."id" = $1 AND "Pin"."utcDeletedDateTime" IS NULL
    ORDER BY "Pin"."Media.id", "Pin"."Merchant.id"`,
      userId ? [pinId, userId] : [pinId],
    );
    let pin: Pin | undefined;
    if (rows.length) {
      pin = Pin.mapPinJoins(new Pin(rows[0]), rows);
    }
    return { pin };
  } catch (err) {
    console.log('Pin queryById err', err);
    throw err;
  }
}

async function updatePinRow(pin: Pin, userId: number | null, query: QueryFn = db.query) {
  normalizeAllDayDates(pin);
  const values = [
    pin.id, pin.parentId, pin.title, pin.description, pin.sourceUrl, pin.longFormSummary,
    pin.dateConfidence, pin.dateConfidenceReasoning, pin.companyId,
    pin.category, pin.address, pin.priceLowerBound, pin.priceUpperBound, pin.price,
    pin.priceCurrency, pin.tip, pin.utcStartDateTime, pin.utcEndDateTime, pin.allDay,
    userId, pin.latitude, pin.longitude, pin.sourceStartDateTime || null, pin.sourceEndDateTime || null,
    pin.originalStartDate || null, pin.delayReasoning || null,
  ].map((value) => (value === undefined ? null : value));

  // Every column is written, so a field missing from the pin is cleared - the
  // edit form sends the whole pin for this reason.
  await query(
    `
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
      "location" = ${locationSql('$21', '$22')},
      "sourceStartDateTime" = $23,
      "sourceEndDateTime" = $24,
      "originalStartDate" = $25,
      "delayReasoning" = $26,
      "utcUpdatedDateTime" = now()
    WHERE "id" = $1`,
    values,
  );
  return { pin };
}

// A soft delete: the row stays, marked with when it was deleted.
async function deletePinRow(pin: Pin) {
  const rows = await db.query(
    `UPDATE "Pin" SET "utcDeletedDateTime" = now() WHERE "id" = $1 RETURNING "utcDeletedDateTime"`,
    [pin.id],
  );
  const utcDeletedDateTime = rows.length ? rows[0].utcDeletedDateTime : undefined;
  pin.utcDeletedDateTime = utcDeletedDateTime;
  return { utcDeletedDateTime, pin };
}

// The part of a source URL two pins must not share: trimmed, without http(s)://.
export function sameSourceUrlKey(sourceUrl: string | null | undefined) {
  return (sourceUrl ?? '').trim().replace(/^https?:\/\//i, '');
}
