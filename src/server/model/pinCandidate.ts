// The big-four contenders an awards pin lists (PinCandidate, 0146).

import * as db from '../db';
import { isCandidateCategory, type PinCandidateJson, type StoredPinCandidate } from '@/lib/candidates';

type Row = {
  category: PinCandidateJson['category'];
  rank: number;
  name: string;
  artist: string | null;
  odds: number | null;
  oddsLabel: PinCandidateJson['oddsLabel'];
  sourceUrl: string | null;
  asOf: Date | string;
  workPinId: number | null;
  workTitle: string | null;
};

const day = (value: Date | string) => (typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10));

export async function candidatesForPin(pinId: number): Promise<PinCandidateJson[]> {
  const rows = await db.query<Row>(
    `SELECT c."category", c."rank", c."name", c."artist", c."odds", c."oddsLabel", c."sourceUrl", c."asOf",
            c."workPinId", w."title" AS "workTitle"
     FROM "PinCandidate" c
     LEFT JOIN "Pin" w ON w."id" = c."workPinId" AND w."utcDeletedDateTime" IS NULL
     WHERE c."pinId" = $1
     ORDER BY c."category", c."rank"`,
    [pinId],
  );
  return rows.map((r) => ({
    category: r.category,
    rank: r.rank,
    name: r.name,
    artist: r.artist,
    work: r.workPinId && r.workTitle ? { id: r.workPinId, title: r.workTitle } : null,
    odds: r.odds,
    oddsLabel: r.oddsLabel,
    sourceUrl: r.sourceUrl,
    asOf: day(r.asOf),
  }));
}

// The rows, or a sentence saying what is wrong with them.
export function candidatesProblem(body: unknown): StoredPinCandidate[] | string {
  if (!Array.isArray(body) || body.length > 200) return 'candidates is a list of up to 200 rows.';
  const rows: StoredPinCandidate[] = [];
  for (const item of body as Record<string, unknown>[]) {
    if (!isCandidateCategory(item.category)) return 'category must be record, album, song or artist.';
    if (!Number.isInteger(item.rank) || (item.rank as number) < 1) return 'rank is a whole number from 1.';
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 200) return 'name is 1-200 characters.';
    if (item.odds != null && (!Number.isInteger(item.odds) || (item.odds as number) < 0 || (item.odds as number) > 100)) return 'odds is 0-100 cents.';
    rows.push({
      pinId: Number(item.pinId),
      category: item.category,
      rank: item.rank as number,
      name: item.name.trim(),
      artist: typeof item.artist === 'string' && item.artist.trim() ? item.artist.trim() : null,
      workPinId: Number.isInteger(item.workPinId) ? (item.workPinId as number) : null,
      odds: (item.odds as number | null) ?? null,
      oddsLabel: item.oddsLabel === 'nominee' || item.oddsLabel === 'winner' ? item.oddsLabel : null,
      sourceUrl: typeof item.sourceUrl === 'string' && /^https?:\/\/\S+$/i.test(item.sourceUrl) ? item.sourceUrl : null,
      asOf: typeof item.asOf === 'string' ? item.asOf.slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
  }
  return rows;
}

// Replaces a pin's whole list in one transaction.
export async function saveCandidates(pinId: number, rows: Omit<StoredPinCandidate, 'pinId'>[]): Promise<void> {
  await db.transaction(async (query) => {
    await query(`DELETE FROM "PinCandidate" WHERE "pinId" = $1`, [pinId]);
    for (const r of rows) {
      await query(
        `INSERT INTO "PinCandidate" ("pinId", "category", "rank", "name", "artist", "workPinId", "odds", "oddsLabel", "sourceUrl", "asOf")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [pinId, r.category, r.rank, r.name, r.artist, r.workPinId, r.odds, r.oddsLabel, r.sourceUrl, r.asOf],
      );
    }
  });
}

export async function allCandidates(): Promise<StoredPinCandidate[]> {
  const rows = await db.query<StoredPinCandidate & { asOf: Date | string }>(
    `SELECT "pinId", "category", "rank", "name", "artist", "workPinId", "odds", "oddsLabel", "sourceUrl", "asOf"
     FROM "PinCandidate" ORDER BY "pinId", "category", "rank"`,
  );
  return rows.map((r) => ({ ...r, asOf: day(r.asOf) }));
}

// Puts backed-up rows back for the pins that exist; a work pin that is gone
// is left unlinked.
export async function restoreCandidates(rows: StoredPinCandidate[]): Promise<void> {
  const byPin = new Map<number, StoredPinCandidate[]>();
  for (const r of rows) byPin.set(r.pinId, [...(byPin.get(r.pinId) ?? []), r]);
  for (const [pinId, list] of byPin) {
    const [pin] = await db.query(`SELECT 1 FROM "Pin" WHERE "id" = $1`, [pinId]);
    if (!pin) continue;
    const workIds = list.map((r) => r.workPinId).filter((id): id is number => id != null);
    const found = workIds.length ? await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "id" = ANY($1::int[])`, [workIds]) : [];
    const have = new Set(found.map((r) => r.id));
    await saveCandidates(pinId, list.map((r) => ({ ...r, workPinId: r.workPinId && have.has(r.workPinId) ? r.workPinId : null })));
  }
}
