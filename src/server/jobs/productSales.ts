// The productSales task (docs/okf/scraping/daily-jobs.md#productsales): keeps
// the "Sales figures" panel (PinSales, 0267) current. Pins that already have
// figures are re-checked against the publisher's newest announcement, and
// recently released goods pins with none are looked at for a launch figure.

import * as db from '../db';
import { saveSales, salesProblem } from '../model/pinSales';

export type SalesCandidate = { pinId: number; title: string; productName: string | null; start: string; rows: number; newest: string | null; lastChecked: string | null };

// `refresh` = pins with figures, least recently saved first; `candidates` =
// goods pins tagged Released in the last 120 days with no figure yet, newest first.
export async function salesStatus(limit = 8, skip: number[] = []): Promise<{ refresh: SalesCandidate[]; candidates: SalesCandidate[]; remaining: number }> {
  const rows = await db.query<{ id: number; title: string; productName: string | null; start: Date; n: string; newest: Date | null; checked: Date | null }>(
    `SELECT p."id", p."title", p."productName", p."utcStartDateTime" AS "start",
       (SELECT count(*) FROM "PinSales" s WHERE s."pinId" = p."id") AS "n",
       (SELECT max(s."asOf") FROM "PinSales" s WHERE s."pinId" = p."id") AS "newest",
       (SELECT max(s."createdAt") FROM "PinSales" s WHERE s."pinId" = p."id") AS "checked"
     FROM "Pin" p
     WHERE p."utcDeletedDateTime" IS NULL
       AND (EXISTS (SELECT 1 FROM "PinSales" s WHERE s."pinId" = p."id")
         OR (EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" = 'Released')
             AND NOT EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" = 'Predicted')
             AND p."utcStartDateTime" BETWEEN now() - interval '120 days' AND now()))`,
  );
  const all = rows
    .filter((r) => !skip.includes(r.id))
    .map((r): SalesCandidate => ({
      pinId: r.id,
      title: r.title,
      productName: r.productName,
      start: r.start.toISOString().slice(0, 10),
      rows: Number(r.n),
      newest: r.newest ? new Date(r.newest).toISOString().slice(0, 10) : null,
      lastChecked: r.checked ? r.checked.toISOString() : null,
    }));
  const refresh = all.filter((r) => r.rows > 0).sort((a, b) => String(a.lastChecked).localeCompare(String(b.lastChecked)));
  const candidates = all.filter((r) => r.rows === 0).sort((a, b) => b.start.localeCompare(a.start));
  const picked = [...refresh, ...candidates].slice(0, limit);
  return { refresh: picked.filter((r) => r.rows > 0), candidates: picked.filter((r) => r.rows === 0), remaining: Math.max(0, all.length - picked.length) };
}

// Checks and saves one pin's figures here, replacing its rows. Rows are never
// empty: a pin whose figures are all unpublished is left as it is.
export async function savePinSales(pinId: number, input: unknown) {
  const checked = salesProblem({ figures: input });
  if (typeof checked === 'string') throw new Error(checked);
  const [pin] = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new Error(`Pin ${pinId} not found`);
  await saveSales(pinId, checked);
  return checked;
}
