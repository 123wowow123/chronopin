import * as db from '../db';
import type { Row } from '../db';
import BasePin, { BasePinProp } from './basePin';
import Company from './company';
import Merchant from './merchant';
import PinReference from './pinReference';
import type User from './user';
import { createPin, locationSql, mapSubObjectFromQuery, normalizeAllDayDates } from './pinShared';

const prop = BasePinProp.concat(['favoriteCount', 'likeCount', 'hasFavorite', 'hasLike', 'reverseOrder']);

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
      const mediaSaved = Promise.all(this.media.map((m) => m.saveWithThumb()));
      // Merchants one at a time, so their ids follow the order the form lists them.
      for (const m of this.merchants) {
        await m.save();
      }
      for (const r of this.references) {
        await r.save();
      }
      await mediaSaved;
      return { pin: this };
    } catch (err) {
      console.log(`Pin '${this.title}' save err:`);
      console.log(`Pin '${this.id}' save err:`, err);
      throw err;
    }
  }

  // Who may update is decided by the caller (canModify in the pins route).
  async update(): Promise<{ pin: Pin }> {
    const res = await Pin.queryById(this.id, this.userId);
    const beforePinMedia = res.pin?.media ?? [];
    const newPinMedia = this.media;
    const newPinMerchants = this.merchants;
    const newPinReferences = this.references;

    const toSaveOriginalMedia = difference(newPinMedia, beforePinMedia, 'originalUrl');
    const toDeleteOriginalMedia = difference(beforePinMedia, newPinMedia, 'originalUrl');

    // Merchants are replaced wholesale; each saves in place with a new id.
    const allMerchantPromise = Merchant.deleteByPinId(this.id).then(async () => {
      for (const m of newPinMerchants) {
        await m.save();
      }
    });

    // References too; each keeps the utcCreatedDateTime it came with.
    const allReferencePromise = PinReference.deleteByPinId(this.id).then(async () => {
      for (const r of newPinReferences) {
        await r.save();
      }
    });

    const toSaveMediaPromise = Promise.all(toSaveOriginalMedia.map((medium) => medium.saveWithThumb()));

    // Removes the link and row; the file stays on the CDN.
    const toDeleteMediaPromise = Promise.all(toDeleteOriginalMedia.map((medium) => medium.deleteFromPin()));

    await Promise.all([toSaveMediaPromise, toDeleteMediaPromise, allMerchantPromise, allReferencePromise]);
    await Company.applyToPin(this);
    return updatePinRow(this, this.userId);
  }

  delete() {
    return deletePinRow(this);
  }

  static queryById(pinId: number, userId?: number | null): Promise<{ pin: Pin | undefined }> {
    return queryPinById(pinId, userId || null);
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

async function updatePinRow(pin: Pin, userId: number | null) {
  normalizeAllDayDates(pin);
  const values = [
    pin.id, pin.parentId, pin.title, pin.description, pin.sourceUrl, pin.longFormSummary,
    pin.dateConfidence, pin.dateConfidenceReasoning, pin.companyId,
    pin.category, pin.address, pin.priceLowerBound, pin.priceUpperBound, pin.price,
    pin.priceCurrency, pin.tip, pin.utcStartDateTime, pin.utcEndDateTime, pin.allDay,
    userId, pin.latitude, pin.longitude, pin.sourceStartDateTime || null, pin.sourceEndDateTime || null,
  ].map((value) => (value === undefined ? null : value));

  // Every column is written, so a field missing from the pin is cleared - the
  // edit form sends the whole pin for this reason.
  await db.query(
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
