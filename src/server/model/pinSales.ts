// A product pin's published sales figures (PinSales, 0267). Only a stated,
// sourced figure is stored; the pin page shows them newest first.

import * as db from "../db";
import {
  SALES_METRICS,
  type PinSalesJson,
  type SalesMetric,
} from "@/lib/sales";

type Row = Omit<PinSalesJson, "value" | "asOf"> & {
  value: string;
  asOf: Date | string | null;
};

const toJson = (row: Row): PinSalesJson => ({
  ...row,
  value: Number(row.value),
  asOf: row.asOf ? new Date(row.asOf).toISOString().slice(0, 10) : null,
});

export async function salesForPin(pinId: number): Promise<PinSalesJson[]> {
  const rows = await db.query<Row>(
    `SELECT "id", "metric", "value", "currency", "asOf", "period", "scope", "sourceUrl", "quote"
     FROM "PinSales" WHERE "pinId" = $1 ORDER BY "asOf" DESC NULLS LAST, "id"`,
    [pinId],
  );
  return rows.map(toJson);
}

type Figure = {
  metric: SalesMetric;
  value: number;
  currency: string | null;
  asOf: string | null;
  period: string | null;
  scope: string | null;
  sourceUrl: string;
  quote: string | null;
};

const text = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

// The figures, or a sentence saying what is wrong with them.
export function salesProblem(body: Record<string, unknown>): Figure[] | string {
  const list = body.figures;
  if (!Array.isArray(list) || !list.length || list.length > 50)
    return "figures is a list of 1 to 50 sales figures.";
  const out: Figure[] = [];
  for (const [i, raw] of list.entries()) {
    const f = (raw ?? {}) as Record<string, unknown>;
    const at = `figures[${i}]`;
    if (!SALES_METRICS.includes(f.metric as SalesMetric))
      return `${at}.metric must be one of ${SALES_METRICS.join(", ")}.`;
    const value = Number(f.value);
    if (!Number.isFinite(value) || value < 0)
      return `${at}.value must be a number of 0 or more.`;
    const currency =
      typeof f.currency === "string" && /^[A-Za-z]{3}$/.test(f.currency)
        ? f.currency.toUpperCase()
        : null;
    if ((f.metric === "revenue") !== (currency !== null))
      return `${at}: revenue needs a 3-letter currency and units must have none.`;
    const asOf =
      typeof f.asOf === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(f.asOf) &&
      !Number.isNaN(Date.parse(f.asOf))
        ? f.asOf
        : null;
    if (f.asOf && !asOf) return `${at}.asOf must be a YYYY-MM-DD date.`;
    const sourceUrl =
      typeof f.sourceUrl === "string" &&
      /^https?:\/\/\S+$/i.test(f.sourceUrl) &&
      f.sourceUrl.length <= 4000
        ? f.sourceUrl
        : null;
    if (!sourceUrl)
      return `${at}.sourceUrl must be the web address the figure was read from.`;
    out.push({
      metric: f.metric as SalesMetric,
      value,
      currency,
      asOf,
      period: text(f.period, 80),
      scope: text(f.scope, 60),
      sourceUrl,
      quote: text(f.quote, 500),
    });
  }
  return out;
}

// Replaces the pin's figures with these, in one transaction.
export async function saveSales(
  pinId: number,
  figures: Figure[],
): Promise<void> {
  await db.transaction(async (query) => {
    await query(`DELETE FROM "PinSales" WHERE "pinId" = $1`, [pinId]);
    for (const f of figures) {
      await query(
        `INSERT INTO "PinSales" ("pinId", "metric", "value", "currency", "asOf", "period", "scope", "sourceUrl", "quote")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          pinId,
          f.metric,
          f.value,
          f.currency,
          f.asOf,
          f.period,
          f.scope,
          f.sourceUrl,
          f.quote,
        ],
      );
    }
  });
}

export async function deleteSales(pinId: number): Promise<void> {
  await db.query(`DELETE FROM "PinSales" WHERE "pinId" = $1`, [pinId]);
}
