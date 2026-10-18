import * as db from '../db';
import type { TradeRow, ParsedTrade, TradeSummary } from '@/lib/trades';

export type TradeFiling = {
  chamber: 'house' | 'senate' | 'executive';
  filingId: string;
  filedDate: string | null;
  sourceUrl: string;
  trades: ParsedTrade[];
};

export type WatchStatus = { watcherCount: number; watching: boolean };

const COLUMNS = `"id", "chamber", "filingId", "owner", "asset", "ticker", "assetType", "txType", "txDate"::text AS "txDate",
  "notifiedDate"::text AS "notifiedDate", "filedDate"::text AS "filedDate", "amountLow"::float8 AS "amountLow", "amountHigh"::float8 AS "amountHigh", "sourceUrl"`;

// Stock trades a person disclosed (0188), and who watches for new ones.
export default class PersonTrade {
  // Newest transaction first.
  static list(personId: number, limit = 500) {
    return db.query<TradeRow>(`SELECT ${COLUMNS} FROM "PersonTrade" WHERE "personId" = $1 ORDER BY "txDate" DESC, "id" DESC LIMIT $2`, [personId, limit]);
  }

  // Stores one filing's trades. A line already stored is skipped, so a
  // filing read twice adds nothing. Answers with how many lines were new
  // (storeFiling in services/personTrades tells the watchers).
  static async addFiling(personId: number, filing: TradeFiling): Promise<number> {
    let added = 0;
    for (const t of filing.trades) {
      const rows = await db.query(
        `INSERT INTO "PersonTrade" ("personId", "chamber", "filingId", "owner", "asset", "ticker", "assetType", "txType", "txDate", "notifiedDate", "filedDate", "amountLow", "amountHigh", "sourceUrl")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT ON CONSTRAINT "UC_PersonTrade_line" DO NOTHING
         RETURNING "id"`,
        [personId, filing.chamber, filing.filingId, t.owner, t.asset.slice(0, 300), t.ticker, t.assetType, t.txType, t.txDate, t.notifiedDate, filing.filedDate, t.amountLow, t.amountHigh, filing.sourceUrl],
      );
      added += rows.length;
    }
    return added;
  }

  // The totals over every stored trade (the page lists only the newest ones):
  // counts, the summed range ends, the most-traded tickers and the period.
  static async summary(personId: number): Promise<TradeSummary> {
    const [row] = await db.query<{ count: number; purchases: number; sales: number; low: number | null; high: number | null; first: string | null; last: string | null }>(
      `SELECT count(*)::int AS "count", count(*) FILTER (WHERE "txType" = 'purchase')::int AS "purchases", count(*) FILTER (WHERE "txType" IN ('sale', 'partial'))::int AS "sales",
              sum("amountLow")::float8 AS "low", sum(COALESCE("amountHigh", "amountLow"))::float8 AS "high", min("txDate")::text AS "first", max("txDate")::text AS "last"
       FROM "PersonTrade" WHERE "personId" = $1`,
      [personId],
    );
    const tickers = await db.query<{ ticker: string; count: number }>(
      `SELECT "ticker", count(*)::int AS "count" FROM "PersonTrade" WHERE "personId" = $1 AND "ticker" IS NOT NULL GROUP BY "ticker" ORDER BY 2 DESC, 1 LIMIT 8`,
      [personId],
    );
    return { count: row.count, purchases: row.purchases, sales: row.sales, volumeLow: row.low ?? 0, volumeHigh: row.high ?? 0, tickers, first: row.first, last: row.last };
  }

  // Re-reads of a filing whose earlier parse was wrong (a wrapped amount, a
  // missed row): swaps the stored lines for the new ones as a unit, because
  // the unique line key includes the asset text and low amount. Silent - no
  // watcher is told - and refused when the new parse has fewer lines than
  // are stored (a worse read must not erase trades). Answers with how many
  // lines changed. A filing with nothing stored is simply added.
  static async replaceFiling(personId: number, filing: TradeFiling): Promise<number> {
    const old = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM "PersonTrade" WHERE "chamber" = $1 AND "filingId" = $2 AND "personId" = $3`, [filing.chamber, filing.filingId, personId]);
    if (!old[0]?.n) return PersonTrade.addFiling(personId, filing); // never stored (it parsed to nothing before)
    if (filing.trades.length < old[0].n) return 0;
    const key = (t: { owner: string; asset: string; txType: string; txDate: string; amountLow: number | null; amountHigh: number | null; ticker: string | null; assetType: string | null }) =>
      [t.owner, t.asset, t.txType, t.txDate, t.amountLow, t.amountHigh, t.ticker, t.assetType].join('|');
    const stored = await db.query<any>(`SELECT "owner", "asset", "txType", "txDate"::text AS "txDate", "amountLow"::float8 AS "amountLow", "amountHigh"::float8 AS "amountHigh", "ticker", "assetType" FROM "PersonTrade" WHERE "chamber" = $1 AND "filingId" = $2 AND "personId" = $3`, [filing.chamber, filing.filingId, personId]);
    const before = new Set(stored.map(key));
    const after = new Set(filing.trades.map((t) => key({ ...t, asset: t.asset.slice(0, 300) })));
    if (before.size === after.size && [...before].every((k) => after.has(k))) return 0;
    return db.transaction(async (q) => {
      await q(`DELETE FROM "PersonTrade" WHERE "chamber" = $1 AND "filingId" = $2 AND "personId" = $3`, [filing.chamber, filing.filingId, personId]);
      let n = 0;
      for (const t of filing.trades) {
        n += (
          await q(
            `INSERT INTO "PersonTrade" ("personId", "chamber", "filingId", "owner", "asset", "ticker", "assetType", "txType", "txDate", "notifiedDate", "filedDate", "amountLow", "amountHigh", "sourceUrl")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT ON CONSTRAINT "UC_PersonTrade_line" DO NOTHING RETURNING "id"`,
            [personId, filing.chamber, filing.filingId, t.owner, t.asset.slice(0, 300), t.ticker, t.assetType, t.txType, t.txDate, t.notifiedDate, filing.filedDate, t.amountLow, t.amountHigh, filing.sourceUrl],
          )
        ).length;
      }
      return n;
    });
  }

  static async has(chamber: string, filingId: string): Promise<boolean> {
    const rows = await db.query(`SELECT 1 FROM "PersonTrade" WHERE "chamber" = $1 AND "filingId" = $2 LIMIT 1`, [chamber, filingId]);
    return rows.length > 0;
  }

  static async watch(userId: number, personId: number) {
    const rows = await db.query(
      `INSERT INTO "PersonTradeWatch" ("userId", "personId") VALUES ($1, $2)
       ON CONFLICT ("userId", "personId") DO UPDATE SET "utcDeletedDateTime" = NULL
       WHERE "PersonTradeWatch"."utcDeletedDateTime" IS NOT NULL
       RETURNING "userId"`,
      [userId, personId],
    );
    return { changed: !!rows.length };
  }

  static async unwatch(userId: number, personId: number) {
    const rows = await db.query(
      `UPDATE "PersonTradeWatch" SET "utcDeletedDateTime" = now() WHERE "userId" = $1 AND "personId" = $2 AND "utcDeletedDateTime" IS NULL RETURNING "userId"`,
      [userId, personId],
    );
    return { changed: !!rows.length };
  }

  static async status(personId: number, viewerId: number | null | undefined): Promise<WatchStatus> {
    const rows = await db.query<WatchStatus>(
      `SELECT
         (SELECT COUNT(*)::int FROM "PersonTradeWatch" w JOIN "User" u ON u."id" = w."userId"
           WHERE w."personId" = $1 AND w."utcDeletedDateTime" IS NULL AND u."utcDeletedDateTime" IS NULL) AS "watcherCount",
         EXISTS (SELECT 1 FROM "PersonTradeWatch" WHERE "personId" = $1 AND "userId" = $2 AND "utcDeletedDateTime" IS NULL) AS "watching"`,
      [personId, viewerId ?? null],
    );
    return rows[0];
  }

  // Watching every person's trades (0190).
  static async watchAll(userId: number) {
    const rows = await db.query(
      `INSERT INTO "PersonTradeWatchAll" ("userId") VALUES ($1)
       ON CONFLICT ("userId") DO UPDATE SET "utcDeletedDateTime" = NULL
       WHERE "PersonTradeWatchAll"."utcDeletedDateTime" IS NOT NULL
       RETURNING "userId"`,
      [userId],
    );
    return { changed: !!rows.length };
  }

  static async unwatchAll(userId: number) {
    const rows = await db.query(
      `UPDATE "PersonTradeWatchAll" SET "utcDeletedDateTime" = now() WHERE "userId" = $1 AND "utcDeletedDateTime" IS NULL RETURNING "userId"`,
      [userId],
    );
    return { changed: !!rows.length };
  }

  static async statusAll(viewerId: number | null | undefined) {
    const rows = await db.query<{ watcherCount: number; watching: boolean }>(
      `SELECT
         (SELECT COUNT(*)::int FROM "PersonTradeWatchAll" w JOIN "User" u ON u."id" = w."userId"
           WHERE w."utcDeletedDateTime" IS NULL AND u."utcDeletedDateTime" IS NULL) AS "watcherCount",
         EXISTS (SELECT 1 FROM "PersonTradeWatchAll" WHERE "userId" = $1 AND "utcDeletedDateTime" IS NULL) AS "watching"`,
      [viewerId ?? null],
    );
    return rows[0];
  }
}
