// The goods pins that list no competing products: read by the jobs'
// product_competitor_gaps tool (./tools.ts) for the productCompetitors task
// (docs/okf/scraping/daily-jobs.md#productcompetitors).
//
// A goods pin (tagged Announced or Released by productLifecycle) carries its
// main rivals in PinCompetitor (0211). A new pin has none the day it is saved;
// this finds it.

import * as db from '../db';

export type CompetitorGap = { pinId: number; title: string; productName: string | null; start: string; rivals: number; author: string | null };

// Pins with no rivals first, then pins with a single one (the rule is 2-5),
// then pins whose rivals came from extraction and still have no source page,
// then pins with a rival that has no pin yet (the task creates it).
export async function competitorGaps(limit = 5, skip: number[] = []): Promise<{ gaps: CompetitorGap[]; remaining: number }> {
  const rows = await db.query<{ id: number; title: string; productName: string | null; start: Date; rivals: string; author: string | null }>(
    `SELECT p."id", p."title", p."productName", p."utcStartDateTime" AS "start", u."userName" AS "author",
       (SELECT count(*) FROM "PinCompetitor" c WHERE c."pinId" = p."id") AS "rivals"
     FROM "Pin" p LEFT JOIN "User" u ON u."id" = p."userId"
     WHERE p."utcDeletedDateTime" IS NULL
       AND EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" IN ('Announced', 'Released'))
       AND NOT EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" = 'Predicted')
       AND ((SELECT count(*) FROM "PinCompetitor" c WHERE c."pinId" = p."id") < 2
            OR EXISTS (SELECT 1 FROM "PinCompetitor" c WHERE c."pinId" = p."id" AND c."sourceUrl" IS NULL
              OR c."competitorPinId" IS NULL))
     ORDER BY (SELECT count(*) FROM "PinCompetitor" c WHERE c."pinId" = p."id"), p."utcStartDateTime" DESC`,
  );
  const gaps = rows
    .filter((row) => !skip.includes(row.id))
    .map((row) => ({ pinId: row.id, title: row.title, productName: row.productName, start: row.start.toISOString().slice(0, 10), rivals: Number(row.rivals), author: row.author }));
  return { gaps: gaps.slice(0, limit), remaining: Math.max(0, gaps.length - limit) };
}
