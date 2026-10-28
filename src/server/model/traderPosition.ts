import * as db from '../db';
import type { TraderPositionRow } from '@/lib/traders';

const COLUMNS = `"id", "traderSlug", "traderName", "ticker", "instrument", "action", to_char("tradeDate", 'YYYY-MM-DD') AS "tradeDate", "summary", "sourceUrl", "sourceTitle", "entryPrice"`;

export default class TraderPosition {
  static list(traderSlug: string): Promise<TraderPositionRow[]> {
    return db.query<TraderPositionRow>(`SELECT ${COLUMNS} FROM "TraderPosition" WHERE "traderSlug" = $1 ORDER BY "tradeDate" DESC, "id" DESC`, [traderSlug]);
  }

  static async counts(): Promise<{ traderSlug: string; traderName: string; positions: number }[]> {
    return db.query(`SELECT "traderSlug", max("traderName") AS "traderName", count(*)::int AS "positions" FROM "TraderPosition" GROUP BY "traderSlug" ORDER BY 3 DESC`);
  }

  static async count(traderSlug: string): Promise<number> {
    const [row] = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM "TraderPosition" WHERE "traderSlug" = $1`, [traderSlug]);
    return row?.n ?? 0;
  }

  // Insert one position; null when this exact move is already recorded.
  static async insert(p: Omit<TraderPositionRow, 'id' | 'lastPrice' | 'estimatedPnlPercent'>): Promise<TraderPositionRow | null> {
    const [row] = await db.query<TraderPositionRow>(
      `INSERT INTO "TraderPosition" ("traderSlug", "traderName", "ticker", "instrument", "action", "tradeDate", "summary", "sourceUrl", "sourceTitle", "entryPrice")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING RETURNING ${COLUMNS}`,
      [p.traderSlug, p.traderName, p.ticker, p.instrument, p.action, p.tradeDate, p.summary, p.sourceUrl, p.sourceTitle, p.entryPrice],
    );
    return row ?? null;
  }

  static setEntryPrice(id: number, price: number) {
    return db.query(`UPDATE "TraderPosition" SET "entryPrice" = $2 WHERE "id" = $1`, [id, price]);
  }

  static markPushed(id: number) {
    return db.query(`UPDATE "TraderPosition" SET "utcPushedDateTime" = now() WHERE "id" = $1`, [id]);
  }

  // Moves traded on or after a day (YYYY-MM-DD) across every trader, for the notification panel.
  static since(day: string, limit: number): Promise<TraderPositionRow[]> {
    return db.query<TraderPositionRow>(`SELECT ${COLUMNS} FROM "TraderPosition" WHERE "tradeDate" >= $1::date ORDER BY "tradeDate" DESC, "id" DESC LIMIT $2`, [day, limit]);
  }

  static async unpushed(): Promise<TraderPositionRow[]> {
    return db.query<TraderPositionRow>(`SELECT ${COLUMNS} FROM "TraderPosition" WHERE "utcPushedDateTime" IS NULL ORDER BY "tradeDate", "id"`);
  }
}
