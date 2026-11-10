// A pin's market-moving weight (PinMarketImpact, 0253). One row per pin.
import * as db from '../db';
import type { PinMarketImpactJson } from '@/lib/marketImpact';

export async function marketImpactForPin(pinId: number): Promise<PinMarketImpactJson | null> {
  const [r] = await db.query<PinMarketImpactJson>(`SELECT "weight"::integer AS "weight", "reason", "assets" FROM "PinMarketImpact" WHERE "pinId" = $1`, [pinId]);
  return r ?? null;
}

export async function saveMarketImpact(pinId: number, i: PinMarketImpactJson) {
  await db.query(
    `INSERT INTO "PinMarketImpact" ("pinId", "weight", "reason", "assets", "checkedAt") VALUES ($1, $2, $3, $4, now())
     ON CONFLICT ("pinId") DO UPDATE SET "weight" = $2, "reason" = $3, "assets" = $4, "checkedAt" = now()`,
    [pinId, i.weight, i.reason, i.assets],
  );
}

export async function deleteMarketImpact(pinId: number) {
  await db.query(`DELETE FROM "PinMarketImpact" WHERE "pinId" = $1`, [pinId]);
}

export type ImpactCandidate = { id: number; title: string; description: string | null; start: string; company: string | null; marketCap: number | null; tickers: string[]; sourceUrl: string | null };

// Unscored pins starting from `daysBack` days ago to `daysAhead` ahead, those
// with a listed company or tickers first, then the biggest companies, then the
// soonest. `skip` is the ids already judged to have no market angle this run.
export async function impactCandidates(limit: number, daysBack: number, daysAhead: number, skip: number[]): Promise<{ candidates: ImpactCandidate[]; remaining: number }> {
  const rows = await db.query<ImpactCandidate & { total: string }>(
    `SELECT "p"."id", "p"."title", "p"."description", "p"."utcStartDateTime" AS "start", "c"."name" AS "company", "c"."marketCap"::float8 AS "marketCap",
            COALESCE(ARRAY(SELECT s->>'symbol' FROM jsonb_array_elements(COALESCE("p"."stocks", '[]'::jsonb)) AS s), '{}') AS "tickers",
            "p"."sourceUrl", count(*) OVER () AS "total"
     FROM "Pin" AS "p" LEFT JOIN "Company" AS "c" ON "c"."id" = "p"."companyId"
     WHERE "p"."utcDeletedDateTime" IS NULL
       AND "p"."utcStartDateTime" BETWEEN now() - make_interval(days => $2) AND now() + make_interval(days => $3)
       AND NOT EXISTS (SELECT 1 FROM "PinMarketImpact" AS "m" WHERE "m"."pinId" = "p"."id")
       AND NOT ("p"."id" = ANY($4::integer[]))
     ORDER BY ("c"."marketCap" IS NOT NULL OR jsonb_array_length(COALESCE("p"."stocks", '[]'::jsonb)) > 0) DESC, "c"."marketCap" DESC NULLS LAST, "p"."utcStartDateTime", "p"."id"
     LIMIT $1`,
    [limit, daysBack, daysAhead, skip],
  );
  return { candidates: rows.map(({ total: _t, ...r }) => ({ ...r, start: new Date(r.start).toISOString() })), remaining: rows.length ? Math.max(0, Number(rows[0].total) - rows.length) : 0 };
}
