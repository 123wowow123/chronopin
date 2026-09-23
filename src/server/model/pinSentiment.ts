// A pin's tone as news for its company (0068). Scored after a save
// (src/server/extract/pinSentiment.ts) and graphed on a company search.

import { createHash } from 'node:crypto';
import * as db from '../db';

// What a score is read from: the title and the summary. The hash tells a
// changed pin from one saved again as it was.
export type SentimentText = { title: string; description: string | null };

export const sentimentHash = ({ title, description }: SentimentText) =>
  createHash('sha256').update(`${title}\n${description ?? ''}`).digest('hex');

export type StoredPinSentiment = { pinId: number; sentiment: number; textHash: string; utcScoredDateTime: string };

export default class PinSentiment {
  // What scoring a pin reads, and whether its stored score still fits it.
  // Only pins with a company: the graph is a company's, and each score is a call.
  static async context(pinId: number) {
    const rows = await db.query<SentimentText & { company: string; textHash: string | null }>(
      `
    SELECT "Pin"."title", "Pin"."description", "Company"."name" AS "company", "PinSentiment"."textHash"
    FROM "Pin"
      JOIN "Company" ON "Company"."id" = "Pin"."companyId"
      LEFT JOIN "PinSentiment" ON "PinSentiment"."pinId" = "Pin"."id"
    WHERE "Pin"."id" = $1 AND "Pin"."utcDeletedDateTime" IS NULL`,
      [pinId],
    );
    return rows[0];
  }

  static async set(pinId: number, text: SentimentText, sentiment: number) {
    await db.query(
      `
    INSERT INTO "PinSentiment" ("pinId", "sentiment", "textHash", "utcScoredDateTime")
    VALUES ($1, $2, $3, now())
    ON CONFLICT ("pinId") DO UPDATE SET "sentiment" = EXCLUDED."sentiment", "textHash" = EXCLUDED."textHash", "utcScoredDateTime" = now()`,
      [pinId, sentiment, sentimentHash(text)],
    );
  }

  // Live company pins with no score, or one read from text since changed.
  static async unscored(limit: number) {
    const rows = await db.query<SentimentText & { id: number; company: string; textHash: string | null }>(
      `
    SELECT "Pin"."id", "Pin"."title", "Pin"."description", "Company"."name" AS "company", "PinSentiment"."textHash"
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
  static async setIfUnchanged(pinId: number, textHash: string, sentiment: number): Promise<boolean> {
    const context = await PinSentiment.context(pinId);
    if (!context || sentimentHash(context) !== textHash) return false;
    await PinSentiment.set(pinId, context, sentiment);
    return true;
  }

  // A company's scored pins, by when each event happens.
  static forCompany(companyId: number) {
    return db.query<{ id: number; title: string; utcStartDateTime: Date; sentiment: number }>(
      `
    SELECT "Pin"."id", "Pin"."title", "Pin"."utcStartDateTime", "PinSentiment"."sentiment"
    FROM "Pin"
      JOIN "PinSentiment" ON "PinSentiment"."pinId" = "Pin"."id"
    WHERE "Pin"."companyId" = $1 AND "Pin"."utcDeletedDateTime" IS NULL
    ORDER BY "Pin"."utcStartDateTime", "Pin"."id"`,
      [companyId],
    );
  }

  static async getAll(): Promise<StoredPinSentiment[]> {
    const rows = await db.query<{ pinId: number; sentiment: number; textHash: string; utcScoredDateTime: Date }>(
      `SELECT "pinId", "sentiment", "textHash", "utcScoredDateTime" FROM "PinSentiment" ORDER BY "pinId"`,
    );
    return rows.map((r) => ({ ...r, utcScoredDateTime: new Date(r.utcScoredDateTime).toISOString() }));
  }

  // From seedPinSentiments.json; rows for pins that are not there are skipped.
  static async restore(rows: StoredPinSentiment[]) {
    for (const row of rows) {
      await db.query(
        `
      INSERT INTO "PinSentiment" ("pinId", "sentiment", "textHash", "utcScoredDateTime")
      SELECT $1, $2, $3, $4 WHERE EXISTS (SELECT 1 FROM "Pin" WHERE "id" = $1)
      ON CONFLICT ("pinId") DO NOTHING`,
        [row.pinId, row.sentiment, row.textHash, row.utcScoredDateTime],
      );
    }
  }
}
