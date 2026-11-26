import { MAX_OWN_TICKERS } from '@/lib/ownTickers';
import * as db from '../db';

// The tickers readers added to the trades pages (OwnTicker, 0270).
export default class OwnTicker {
  // A reader's symbols, in the order added.
  static async list(userId: number): Promise<string[]> {
    const rows = await db.query<{ symbol: string }>(`SELECT "symbol" FROM "OwnTicker" WHERE "userId" = $1 ORDER BY "utcCreatedDateTime", "symbol"`, [userId]);
    return rows.map((row) => row.symbol);
  }

  // Adds what is new, in the order given, as far as the cap allows, and
  // answers with the list. The reader's row is locked so two requests at once
  // cannot pass the cap together.
  static async add(userId: number, symbols: string[]): Promise<string[]> {
    await db.transaction(async (query) => {
      await query(`SELECT 1 FROM "User" WHERE "id" = $1 FOR UPDATE`, [userId]);
      await query(
        `
        INSERT INTO "OwnTicker" ("userId", "symbol", "utcCreatedDateTime")
        SELECT $1, s."symbol", now() + s."at" * interval '1 microsecond'
        FROM unnest($2::text[]) WITH ORDINALITY AS s("symbol", "at")
        WHERE NOT EXISTS (SELECT 1 FROM "OwnTicker" t WHERE t."userId" = $1 AND t."symbol" = s."symbol")
        ORDER BY s."at"
        LIMIT GREATEST($3 - (SELECT COUNT(*) FROM "OwnTicker" t WHERE t."userId" = $1), 0)
        ON CONFLICT ("userId", "symbol") DO NOTHING`,
        [userId, symbols, MAX_OWN_TICKERS],
      );
    });
    return this.list(userId);
  }

  static async remove(userId: number, symbol: string): Promise<string[]> {
    await db.query(`DELETE FROM "OwnTicker" WHERE "userId" = $1 AND "symbol" = $2`, [userId, symbol]);
    return this.list(userId);
  }

  // Every live reader's tickers, for the alert check.
  static all() {
    return db.query<{ userId: number; symbol: string; added: Date }>(`
      SELECT t."userId", t."symbol", t."utcCreatedDateTime" AS "added"
      FROM "OwnTicker" t
      JOIN "User" u ON u."id" = t."userId" AND u."utcDeletedDateTime" IS NULL
      ORDER BY t."symbol", t."userId"`);
  }
}
