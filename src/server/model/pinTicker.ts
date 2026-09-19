import type { AssetClass, PinStock, StockOrigin, StockRelation } from '@/lib/stocks';
import * as db from '../db';
import type { Row } from '../db';

export type PinTickerRow = {
  id: number;
  pinId: number;
  symbol: string;
  name: string | null;
  assetClass: AssetClass;
  origin: StockOrigin;
  relation: StockRelation;
  note: string | null;
};

export type PriceRow = {
  id: number;
  pinTickerId: number;
  kind: 'posted' | 'start';
  utcStartDateTime: Date | null;
  day: string | null;
  price: number | null;
  utcPriceDateTime: Date | null;
  utcCheckedDateTime: Date | null;
  utcSetDateTime: Date;
};

const PRICE_COLUMNS = `"id", "pinTickerId", "kind", "utcStartDateTime", to_char("day", 'YYYY-MM-DD') AS "day", "price"::float8 AS "price",
  "utcPriceDateTime", "utcCheckedDateTime", "utcSetDateTime"`;

// A pin's stock tickers and their price snapshots (0029).
export default class PinTicker {
  // The pin's tickers, removed ones only when asked (so a company's ticker a
  // person took off is not added back).
  static async forPin(pinId: number, { withRemoved = false } = {}): Promise<(PinTickerRow & { removed: boolean })[]> {
    return db.query(
      `SELECT "id", "pinId", "symbol", "name", "assetClass", "origin", "relation", "note", "utcRemovedDateTime" IS NOT NULL AS "removed"
       FROM "PinTicker" WHERE "pinId" = $1 ${withRemoved ? '' : 'AND "utcRemovedDateTime" IS NULL'}
       ORDER BY CASE "relation" WHEN 'company' THEN 0 WHEN 'related' THEN 1 ELSE 2 END, "id"`,
      [pinId],
    );
  }

  static async forPins(pinIds: number[]): Promise<PinTickerRow[]> {
    if (!pinIds.length) return [];
    return db.query(
      `SELECT "id", "pinId", "symbol", "name", "assetClass", "origin", "relation", "note" FROM "PinTicker"
       WHERE "pinId" = ANY($1::integer[]) AND "utcRemovedDateTime" IS NULL ORDER BY "id"`,
      [pinIds],
    );
  }

  // Adds a ticker, or brings back one that was taken off.
  static async add(pinId: number, t: Omit<PinTickerRow, 'id' | 'pinId'>): Promise<void> {
    await db.query(
      `INSERT INTO "PinTicker" ("pinId", "symbol", "name", "assetClass", "origin", "relation", "note") VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("pinId", "symbol") DO UPDATE SET "utcRemovedDateTime" = NULL, "name" = COALESCE(EXCLUDED."name", "PinTicker"."name"),
         "origin" = EXCLUDED."origin", "relation" = EXCLUDED."relation", "note" = COALESCE(EXCLUDED."note", "PinTicker"."note")`,
      [pinId, t.symbol, t.name, t.assetClass, t.origin, t.relation, t.note],
    );
  }

  static async remove(pinId: number, symbol: string): Promise<boolean> {
    const rows = await db.query(
      `UPDATE "PinTicker" SET "utcRemovedDateTime" = now() WHERE "pinId" = $1 AND "symbol" = $2 AND "utcRemovedDateTime" IS NULL RETURNING "id"`,
      [pinId, symbol],
    );
    return rows.length > 0;
  }

  static async prices(pinTickerIds: number[]): Promise<PriceRow[]> {
    if (!pinTickerIds.length) return [];
    return db.query(`SELECT ${PRICE_COLUMNS} FROM "PinTickerPrice" WHERE "pinTickerId" = ANY($1::integer[]) ORDER BY "utcSetDateTime" DESC, "id" DESC`, [
      pinTickerIds,
    ]);
  }

  // The snapshots a ticker should have: posted, and one for this start.
  static async ensureSnapshots(pinTickerId: number, start: { utcStartDateTime: Date; day: string }): Promise<void> {
    await db.query(`INSERT INTO "PinTickerPrice" ("pinTickerId", "kind") VALUES ($1, 'posted') ON CONFLICT ("pinTickerId") WHERE "kind" = 'posted' DO NOTHING`, [
      pinTickerId,
    ]);
    await db.query(
      `INSERT INTO "PinTickerPrice" ("pinTickerId", "kind", "utcStartDateTime", "day") VALUES ($1, 'start', $2, $3)
       ON CONFLICT ("pinTickerId", "utcStartDateTime") WHERE "kind" = 'start' DO NOTHING`,
      [pinTickerId, start.utcStartDateTime, start.day],
    );
  }

  // A price found, or (price null) that none could be yet.
  static async setPrice(id: number, price: { price: number; at: string } | null): Promise<void> {
    await db.query(
      price
        ? `UPDATE "PinTickerPrice" SET "price" = $2, "utcPriceDateTime" = $3, "utcCheckedDateTime" = now() WHERE "id" = $1`
        : `UPDATE "PinTickerPrice" SET "utcCheckedDateTime" = now() WHERE "id" = $1`,
      price ? [id, price.price, price.at] : [id],
    );
  }

  // The pin's tickers as the pin page shows them.
  static async stocksOf(pinId: number, currentStart: Date | string): Promise<PinStock[]> {
    const tickers = await PinTicker.forPin(pinId);
    const prices = await PinTicker.prices(tickers.map((t) => t.id));
    const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);
    const current = iso(currentStart);
    return tickers.map((t) => {
      const own = prices.filter((p) => p.pinTickerId === t.id);
      const posted = own.find((p) => p.kind === 'posted');
      const starts = own
        .filter((p) => p.kind === 'start')
        .map((p) => ({
          utcStartDateTime: iso(p.utcStartDateTime)!,
          day: p.day!,
          price: p.price != null ? { price: p.price, at: iso(p.utcPriceDateTime)! } : null,
          current: iso(p.utcStartDateTime) === current,
        }))
        // The current start first, then the ones before it, newest first.
        .sort((a, b) => Number(b.current) - Number(a.current));
      return {
        symbol: t.symbol,
        name: t.name,
        assetClass: t.assetClass,
        origin: t.origin,
        relation: t.relation,
        note: t.note,
        posted: posted?.price != null ? { price: posted.price, at: iso(posted.utcPriceDateTime)! } : null,
        starts,
      };
    });
  }

  static async getAll(): Promise<{ tickers: Row[]; prices: Row[] }> {
    return {
      tickers: await db.query(`SELECT * FROM "PinTicker" ORDER BY "id"`),
      prices: await db.query(`SELECT "id", "pinTickerId", "kind", "utcStartDateTime", to_char("day", 'YYYY-MM-DD') AS "day", "price"::float8 AS "price",
        "utcPriceDateTime", "utcCheckedDateTime", "utcSetDateTime" FROM "PinTickerPrice" ORDER BY "id"`),
    };
  }

  static async restore({ tickers = [], prices = [] }: { tickers?: Row[]; prices?: Row[] }): Promise<void> {
    for (const t of tickers) {
      await db.query(
        `INSERT INTO "PinTicker" ("id", "pinId", "symbol", "name", "assetClass", "origin", "relation", "note", "utcCreatedDateTime", "utcRemovedDateTime")
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'company'), $8, $9, $10) ON CONFLICT DO NOTHING`,
        [t.id, t.pinId, t.symbol, t.name, t.assetClass, t.origin, t.relation, t.note, t.utcCreatedDateTime, t.utcRemovedDateTime],
      );
    }
    for (const p of prices) {
      await db.query(
        `INSERT INTO "PinTickerPrice" ("id", "pinTickerId", "kind", "utcStartDateTime", "day", "price", "utcPriceDateTime", "utcCheckedDateTime", "utcSetDateTime")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
        [p.id, p.pinTickerId, p.kind, p.utcStartDateTime, p.day, p.price, p.utcPriceDateTime, p.utcCheckedDateTime, p.utcSetDateTime],
      );
    }
    for (const table of ['PinTicker', 'PinTickerPrice']) {
      await db.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), GREATEST((SELECT MAX("id") FROM "${table}"), 1))`);
    }
  }
}
