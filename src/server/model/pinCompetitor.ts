// The competing products a product pin lists (PinCompetitor, 0211).

import * as db from '../db';
import type { PinCompetitorJson, StoredPinCompetitor } from '@/lib/competitors';

type Row = {
  rank: number;
  name: string;
  maker: string | null;
  summary: string | null;
  sourceUrl: string | null;
  competitorPinId: number | null;
  competitorTitle: string | null;
  thumbName: string | null;
  thumbOriginalUrl: string | null;
};

export async function competitorsForPin(pinId: number): Promise<PinCompetitorJson[]> {
  const rows = await db.query<Row>(
    `SELECT c."rank", c."name", c."maker", c."summary", c."sourceUrl",
            c."competitorPinId", w."title" AS "competitorTitle", pic."thumbName", pic."originalUrl" AS "thumbOriginalUrl"
     FROM "PinCompetitor" c
     LEFT JOIN "Pin" w ON w."id" = c."competitorPinId" AND w."utcDeletedDateTime" IS NULL
     -- The rival's first image, else its first medium.
     LEFT JOIN LATERAL (
       SELECT m."thumbName", CASE WHEN m."type" = '1' THEN m."originalUrl" END AS "originalUrl"
       FROM "PinMedium" pm JOIN "Medium" m ON m."id" = pm."mediumId"
       WHERE pm."pinId" = c."competitorPinId" AND pm."utcDeletedDateTime" IS NULL
       ORDER BY m."type" = '1' DESC, pm."weight" DESC, pm."id"
       LIMIT 1
     ) pic ON true
     WHERE c."pinId" = $1
     ORDER BY c."rank"`,
    [pinId],
  );
  return rows.map((r) => ({
    rank: r.rank,
    name: r.name,
    maker: r.maker,
    pin: r.competitorPinId && r.competitorTitle ? { id: r.competitorPinId, title: r.competitorTitle, thumbName: r.thumbName, originalUrl: r.thumbOriginalUrl } : null,
    summary: r.summary,
    sourceUrl: r.sourceUrl,
  }));
}

// The rows, or a sentence saying what is wrong with them.
export function competitorsProblem(body: unknown): Omit<StoredPinCompetitor, 'pinId'>[] | string {
  if (!Array.isArray(body) || body.length > 12) return 'competitors is a list of up to 12 rows.';
  const rows: Omit<StoredPinCompetitor, 'pinId'>[] = [];
  for (const item of body as Record<string, unknown>[]) {
    if (!Number.isInteger(item.rank) || (item.rank as number) < 1) return 'rank is a whole number from 1.';
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 200) return 'name is 1-200 characters.';
    if (typeof item.summary === 'string' && item.summary.length > 400) return 'summary is up to 400 characters.';
    const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
    rows.push({
      rank: item.rank as number,
      name: item.name.trim(),
      maker: text(item.maker),
      competitorPinId: Number.isInteger(item.competitorPinId) ? (item.competitorPinId as number) : null,
      summary: text(item.summary),
      sourceUrl: typeof item.sourceUrl === 'string' && /^https?:\/\/\S+$/i.test(item.sourceUrl) ? item.sourceUrl : null,
    });
  }
  return rows;
}

// Replaces a pin's whole list in one transaction.
export async function saveCompetitors(pinId: number, rows: Omit<StoredPinCompetitor, 'pinId'>[]): Promise<void> {
  await db.transaction(async (query) => {
    await query(`DELETE FROM "PinCompetitor" WHERE "pinId" = $1`, [pinId]);
    for (const r of rows) {
      await query(
        `INSERT INTO "PinCompetitor" ("pinId", "rank", "name", "maker", "competitorPinId", "summary", "sourceUrl")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [pinId, r.rank, r.name, r.maker, r.competitorPinId, r.summary, r.sourceUrl],
      );
    }
  });
}

export async function allCompetitors(): Promise<StoredPinCompetitor[]> {
  return db.query<StoredPinCompetitor>(
    `SELECT "pinId", "rank", "name", "maker", "competitorPinId", "summary", "sourceUrl" FROM "PinCompetitor" ORDER BY "pinId", "rank"`,
  );
}

// Puts backed-up rows back for the pins that exist; a rival pin that is gone
// is left unlinked.
export async function restoreCompetitors(rows: StoredPinCompetitor[]): Promise<void> {
  const byPin = new Map<number, StoredPinCompetitor[]>();
  for (const r of rows) byPin.set(r.pinId, [...(byPin.get(r.pinId) ?? []), r]);
  for (const [pinId, list] of byPin) {
    const [pin] = await db.query(`SELECT 1 FROM "Pin" WHERE "id" = $1`, [pinId]);
    if (!pin) continue;
    const ids = list.map((r) => r.competitorPinId).filter((id): id is number => id != null);
    const found = ids.length ? await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "id" = ANY($1::int[])`, [ids]) : [];
    const have = new Set(found.map((r) => r.id));
    await saveCompetitors(pinId, list.map((r) => ({ ...r, competitorPinId: r.competitorPinId && have.has(r.competitorPinId) ? r.competitorPinId : null })));
  }
}
