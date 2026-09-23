// A pin's tone as news for its company (0068). Scored after a save
// (src/server/extract/pinSentiment.ts) and graphed on a company search.

import { createHash } from 'node:crypto';
import * as db from '../db';

// What a score is read from: the title and the summary. The hash tells a
// changed pin from one saved again as it was.
export type SentimentText = { title: string; description: string | null };

export const sentimentHash = ({ title, description }: SentimentText) =>
  createHash('sha256').update(`${title}\n${description ?? ''}`).digest('hex');

export type StoredPinSentiment = {
  pinId: number;
  sentiment: number;
  textHash: string;
  utcScoredDateTime: string;
  // 0070: the product line the pin is about, and the text it was read from
  // (null hash: never read).
  product?: string | null;
  productHash?: string | null;
};

// A product name as stored: trimmed, single-spaced, at most 80 characters, or
// null for none.
export function cleanProduct(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.replace(/\s+/g, ' ').trim().slice(0, 80);
  return name && !/^(none|null|n\/a)$/i.test(name) ? name : null;
}

export default class PinSentiment {
  // What scoring a pin reads, and whether its stored score still fits it.
  // Only pins with a company: the graph is a company's, and each score is a call.
  static async context(pinId: number) {
    const rows = await db.query<SentimentText & { companyId: number; company: string; textHash: string | null }>(
      `
    SELECT "Pin"."title", "Pin"."description", "Pin"."companyId", "Company"."name" AS "company", "PinSentiment"."textHash"
    FROM "Pin"
      JOIN "Company" ON "Company"."id" = "Pin"."companyId"
      LEFT JOIN "PinSentiment" ON "PinSentiment"."pinId" = "Pin"."id"
    WHERE "Pin"."id" = $1 AND "Pin"."utcDeletedDateTime" IS NULL`,
      [pinId],
    );
    return rows[0];
  }

  // The score, and the product when it was read in the same pass. Undefined
  // leaves the product unread (a hand score with no product), so the
  // --products backfill picks the pin up.
  static async set(pinId: number, text: SentimentText, sentiment: number, product?: string | null) {
    const hash = sentimentHash(text);
    await db.query(
      `
    INSERT INTO "PinSentiment" ("pinId", "sentiment", "textHash", "utcScoredDateTime", "product", "productHash")
    VALUES ($1, $2, $3, now(), $4, $5)
    ON CONFLICT ("pinId") DO UPDATE SET "sentiment" = EXCLUDED."sentiment", "textHash" = EXCLUDED."textHash", "utcScoredDateTime" = now(),
      "product" = EXCLUDED."product", "productHash" = EXCLUDED."productHash"`,
      [pinId, sentiment, hash, product === undefined ? null : cleanProduct(product), product === undefined ? null : hash],
    );
  }

  // The product alone, for a pin already scored from the text it has now.
  // False when the pin has changed since (or has no score yet): the next
  // scoring reads both.
  static async setProduct(pinId: number, textHash: string, product: string | null): Promise<boolean> {
    const rows = await db.query(
      `UPDATE "PinSentiment" SET "product" = $3, "productHash" = $2 WHERE "pinId" = $1 AND "textHash" = $2 RETURNING "pinId"`,
      [pinId, textHash, cleanProduct(product)],
    );
    return rows.length > 0;
  }

  // Scored pins whose product was never read from the text they have now.
  static async withoutProduct(limit: number) {
    const rows = await db.query<SentimentText & { id: number; companyId: number; company: string; textHash: string }>(
      `
    SELECT "Pin"."id", "Pin"."title", "Pin"."description", "Pin"."companyId", "Company"."name" AS "company", "PinSentiment"."textHash"
    FROM "Pin"
      JOIN "Company" ON "Company"."id" = "Pin"."companyId"
      JOIN "PinSentiment" ON "PinSentiment"."pinId" = "Pin"."id"
    WHERE "Pin"."utcDeletedDateTime" IS NULL AND "PinSentiment"."productHash" IS DISTINCT FROM "PinSentiment"."textHash"
    ORDER BY "Pin"."companyId", "Pin"."utcStartDateTime", "Pin"."id"`,
    );
    // Only those still scored from the text they have: a changed one is
    // rescored, product and all, by the sentiment pass.
    return rows.filter((row) => row.textHash === sentimentHash(row)).slice(0, limit);
  }

  // The product names a company's pins already use, most used first: handed
  // to the model so the next pin reuses one rather than coining a variant.
  static async productsOf(companyId: number, limit = 40): Promise<string[]> {
    const rows = await db.query<{ product: string }>(
      `
    SELECT "PinSentiment"."product"
    FROM "PinSentiment"
      JOIN "Pin" ON "Pin"."id" = "PinSentiment"."pinId"
    WHERE "Pin"."companyId" = $1 AND "Pin"."utcDeletedDateTime" IS NULL AND "PinSentiment"."product" IS NOT NULL
    GROUP BY "PinSentiment"."product"
    ORDER BY count(*) DESC, "PinSentiment"."product"
    LIMIT $2`,
      [companyId, limit],
    );
    return rows.map((r) => r.product);
  }

  // Live company pins with no score, or one read from text since changed.
  static async unscored(limit: number) {
    const rows = await db.query<SentimentText & { id: number; companyId: number; company: string; textHash: string | null }>(
      `
    SELECT "Pin"."id", "Pin"."title", "Pin"."description", "Pin"."companyId", "Company"."name" AS "company", "PinSentiment"."textHash"
    FROM "Pin"
      JOIN "Company" ON "Company"."id" = "Pin"."companyId"
      LEFT JOIN "PinSentiment" ON "PinSentiment"."pinId" = "Pin"."id"
    WHERE "Pin"."utcDeletedDateTime" IS NULL
    ORDER BY "Pin"."id"`,
    );
    return rows.filter((row) => row.textHash !== sentimentHash(row)).slice(0, limit);
  }

  // Saves a score only while the pin's text is still what was scored (the
  // hash handed out with it), so an edit in between is scored again later.
  static async setIfUnchanged(pinId: number, textHash: string, sentiment: number, product?: string | null): Promise<boolean> {
    const context = await PinSentiment.context(pinId);
    if (!context || sentimentHash(context) !== textHash) return false;
    await PinSentiment.set(pinId, context, sentiment, product);
    return true;
  }

  // A company's scored pins, by when each event happens, with the product
  // each is about (null for none, or not read yet).
  static forCompany(companyId: number) {
    return db.query<{ id: number; title: string; utcStartDateTime: Date; sentiment: number; product: string | null }>(
      `
    SELECT "Pin"."id", "Pin"."title", "Pin"."utcStartDateTime", "PinSentiment"."sentiment", "PinSentiment"."product"
    FROM "Pin"
      JOIN "PinSentiment" ON "PinSentiment"."pinId" = "Pin"."id"
    WHERE "Pin"."companyId" = $1 AND "Pin"."utcDeletedDateTime" IS NULL
    ORDER BY "Pin"."utcStartDateTime", "Pin"."id"`,
      [companyId],
    );
  }

  static async getAll(): Promise<StoredPinSentiment[]> {
    const rows = await db.query<{ pinId: number; sentiment: number; textHash: string; utcScoredDateTime: Date; product: string | null; productHash: string | null }>(
      `SELECT "pinId", "sentiment", "textHash", "utcScoredDateTime", "product", "productHash" FROM "PinSentiment" ORDER BY "pinId"`,
    );
    return rows.map((r) => ({ ...r, utcScoredDateTime: new Date(r.utcScoredDateTime).toISOString() }));
  }

  // From seedPinSentiments.json; rows for pins that are not there are skipped.
  static async restore(rows: StoredPinSentiment[]) {
    for (const row of rows) {
      await db.query(
        `
      INSERT INTO "PinSentiment" ("pinId", "sentiment", "textHash", "utcScoredDateTime", "product", "productHash")
      SELECT $1, $2, $3, $4, $5, $6 WHERE EXISTS (SELECT 1 FROM "Pin" WHERE "id" = $1)
      ON CONFLICT ("pinId") DO NOTHING`,
        [row.pinId, row.sentiment, row.textHash, row.utcScoredDateTime, row.product ?? null, row.productHash ?? null],
      );
    }
  }
}
