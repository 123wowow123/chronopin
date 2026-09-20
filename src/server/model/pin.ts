import * as db from '../db';
import type { QueryFn, Row } from '../db';
import BasePin, { BasePinProp } from './basePin';
import Company from './company';
import { saveAllToPin } from './medium';
import Merchant from './merchant';
import PinRating from './pinRating';
import PinReference from './pinReference';
import PinTag from './pinTag';
import type User from './user';
import { createPin, locationSql, mapSubObjectFromQuery, normalizeAllDayDates, normalizeEpisodes } from './pinShared';

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
      if (this.categories) await PinTag.setCategories(this.id, this.categories);
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
    // Left as they are when the body sent none.
    if (this.categories) await PinTag.setCategories(this.id, this.categories);
    return { pin: this };
  }

  delete() {
    return deletePinRow(this);
  }

  static queryById(pinId: number, userId?: number | null): Promise<{ pin: Pin | undefined }> {
    return queryPinById(pinId, userId || null);
  }

  // A live pin with this sourceUrl, other than exceptPinId: by userId, or by
  // anyone when userId is null. http and https count as the same URL. The
  // author comes back with it, so a caller can tell whose pin it found.
  static async findBySourceUrl(userId: number | null, sourceUrl: string | null | undefined, exceptPinId?: number | null) {
    const url = sameSourceUrlKey(sourceUrl);
    if (!url) {
      return undefined;
    }
    const rows = await db.query<{ id: number; title: string; userId: number | null }>(
      `SELECT "id", "title", "userId" FROM "Pin"
       WHERE ($1::int IS NULL OR "userId" = $1) AND regexp_replace(btrim("sourceUrl"), '^https?://', '', 'i') = $2
         AND "utcDeletedDateTime" IS NULL AND "id" <> $3
       ORDER BY "id" LIMIT 1`,
      [userId, url, exceptPinId ?? 0],
    );
    return rows[0];
  }

  // The live pins, by anyone, with each of these sourceUrls, keyed by the URL
  // as given (http and https the same). The first pin wins a shared URL.
  static async findBySourceUrls(sourceUrls: string[]) {
    const byKey = new Map(sourceUrls.filter((u) => sameSourceUrlKey(u)).map((u) => [sameSourceUrlKey(u), u]));
    if (!byKey.size) return new Map<string, { id: number; title: string }>();
    const rows = await db.query<{ id: number; title: string; key: string }>(
      `SELECT DISTINCT ON (key) "id", "title", key FROM (
         SELECT "id", "title", regexp_replace(btrim("sourceUrl"), '^https?://', '', 'i') AS key
         FROM "Pin" WHERE "utcDeletedDateTime" IS NULL) p
       WHERE key = ANY($1) ORDER BY key, "id"`,
      [[...byKey.keys()]],
    );
    return new Map(rows.map((r) => [byKey.get(r.key)!, { id: r.id, title: r.title }]));
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

  // The episode count from a backfill, outside the edit path (the same reason
  // setRatings exists: no author, and nothing else on the pin to rewrite).
  static async setEpisodes(pinId: number, episodes: { episodeCount: number; episodeStatus: string }) {
    const { episodeCount, episodeStatus } = normalizeEpisodes({ ...episodes }) as Row;
    if (!episodeCount) {
      return { pinId };
    }
    await db.query(`UPDATE "Pin" SET "episodeCount" = $2, "episodeStatus" = $3, "utcUpdatedDateTime" = now() WHERE "id" = $1`, [
      pinId,
      episodeCount,
      episodeStatus,
    ]);
    return { pinId, episodeCount, episodeStatus };
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
  normalizeEpisodes(pin);
  const values = [
    pin.id, pin.parentId, pin.title, pin.description, pin.sourceUrl, pin.longFormSummary,
    pin.dateConfidence, pin.dateConfidenceReasoning, pin.companyId,
    pin.address, pin.priceLowerBound, pin.priceUpperBound, pin.price,
    pin.priceCurrency, pin.tip, pin.utcStartDateTime, pin.utcEndDateTime, pin.allDay,
    userId, pin.latitude, pin.longitude, pin.sourceStartDateTime || null, pin.sourceEndDateTime || null,
    pin.originalStartDate || null, pin.delayReasoning || null, pin.episodeCount, pin.episodeStatus,
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
      "address" = $10,
      "priceLowerBound" = $11,
      "priceUpperBound" = $12,
      "price" = $13,
      "priceCurrency" = $14,
      "tip" = $15,
      "utcStartDateTime" = $16,
      "utcEndDateTime" = $17,
      "allDay" = $18,
      "userId" = $19,
      "location" = ${locationSql('$20', '$21')},
      "sourceStartDateTime" = $22,
      "sourceEndDateTime" = $23,
      "originalStartDate" = $24,
      "delayReasoning" = $25,
      "episodeCount" = $26,
      "episodeStatus" = $27,
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
