// Chronopin's call on a market-predicted pin (PinForecast, 0272). One row per pin.
import * as db from '../db';
import type { PinForecastJson } from '@/lib/pinForecast';

type Row = Omit<PinForecastJson, 'evidence'> & { evidence: { pinId: number; note: string }[] };

export async function forecastForPin(pinId: number): Promise<PinForecastJson | null> {
  const [r] = await db.query<Row>(
    `SELECT "outcome", "probability", "marketProbability", "reasoning", "evidence", "checkedAt" FROM "PinForecast" WHERE "pinId" = $1`,
    [pinId],
  );
  if (!r) return null;
  const ids = r.evidence.map((e) => e.pinId);
  // Evidence pins that were deleted since drop out; the rest carry their title for the link.
  const titles = ids.length
    ? await db.query<{ id: number; title: string }>(`SELECT "id", "title" FROM "Pin" WHERE "id" = ANY($1::integer[]) AND "utcDeletedDateTime" IS NULL`, [ids])
    : [];
  const byId = new Map(titles.map((p) => [p.id, p.title]));
  return {
    ...r,
    checkedAt: r.checkedAt ? new Date(r.checkedAt).toISOString() : undefined,
    evidence: r.evidence.filter((e) => byId.has(e.pinId)).map((e) => ({ ...e, title: byId.get(e.pinId)! })),
  };
}

export async function saveForecast(pinId: number, f: Omit<PinForecastJson, 'checkedAt'>) {
  await db.query(
    `INSERT INTO "PinForecast" ("pinId", "outcome", "probability", "marketProbability", "reasoning", "evidence", "checkedAt")
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())
     ON CONFLICT ("pinId") DO UPDATE SET "outcome" = $2, "probability" = $3, "marketProbability" = $4, "reasoning" = $5, "evidence" = $6::jsonb, "checkedAt" = now()`,
    [pinId, f.outcome, f.probability, f.marketProbability, f.reasoning, JSON.stringify(f.evidence.map(({ pinId: id, note }) => ({ pinId: id, note })))],
  );
}

export async function deleteForecast(pinId: number) {
  await db.query(`DELETE FROM "PinForecast" WHERE "pinId" = $1`, [pinId]);
}

// Open predicted pins with no call, or one older than `staleDays`, soonest event first.
export async function forecastCandidates(limit: number, staleDays: number, skip: number[]) {
  const rows = await db.query<{ id: number; title: string; description: string | null; start: string; sourceUrl: string | null; checkedAt: string | null; total: string }>(
    `SELECT "p"."id", "p"."title", "p"."description", "p"."utcStartDateTime" AS "start", "p"."sourceUrl", "f"."checkedAt", count(*) OVER () AS "total"
     FROM "Pin" AS "p" LEFT JOIN "PinForecast" AS "f" ON "f"."pinId" = "p"."id"
     WHERE "p"."utcDeletedDateTime" IS NULL AND "p"."dateConfidence" = 'estimated' AND "p"."utcStartDateTime" > now() - interval '1 day'
       AND "p"."sourceUrl" ~* '(polymarket|kalshi)\\.com'
       AND ("f"."pinId" IS NULL OR "f"."checkedAt" < now() - make_interval(days => $2))
       AND NOT ("p"."id" = ANY($3::integer[]))
     ORDER BY ("f"."pinId" IS NULL) DESC, "p"."utcStartDateTime", "p"."id" LIMIT $1`,
    [limit, staleDays, skip],
  );
  return {
    candidates: rows.map(({ total: _t, ...r }) => ({ ...r, start: new Date(r.start).toISOString() })),
    remaining: rows.length ? Math.max(0, Number(rows[0].total) - rows.length) : 0,
  };
}
