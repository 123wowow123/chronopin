// A film, series or anime pin's awards, matched from the award catalogue
// (src/server/awards.ts) by the work's name, after every save and by
// `npm run media:awards`. Derived data: a sync replaces the pin's rows.

import { matchAwards, type AwardEntry } from '@/lib/awards';
import { PIN_CATEGORIES } from '../model/pinTag';
import { isScreenCategory } from '../scrape/screen';
import { awardCatalogue } from '../awards';
import * as db from '../db';

// The catalogue's entries for these titles (the pin's, or a scrape's work title).
export async function awardsFor(titles: (string | null | undefined)[]): Promise<AwardEntry[]> {
  const named = titles.filter((t): t is string => !!t?.trim());
  if (!named.length) return [];
  return matchAwards(await awardCatalogue(), named);
}

// True when the pin's awards changed.
export async function syncPinAwards(pinId: number): Promise<boolean> {
  const [pin] = await db.query<{ title: string; categories: string[] }>(
    `SELECT "title", ${PIN_CATEGORIES} AS "categories" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  const found = pin && isScreenCategory(pin.categories) ? await awardsFor([pin.title]) : [];
  const key = (a: { body: string; award: string; year: number; work: string; result: string }) => `${a.body}|${a.award}|${a.year}|${a.work}|${a.result}`;
  const stored = await db.query<{ body: string; award: string; year: number; work: string; result: string }>(
    `SELECT "body", "award", "year", "work", "result" FROM "PinAward" WHERE "pinId" = $1`,
    [pinId],
  );
  const now = new Set(found.map(key));
  if (stored.length === now.size && stored.every((a) => now.has(key(a)))) return false;
  await db.transaction(async (query) => {
    await query(`DELETE FROM "PinAward" WHERE "pinId" = $1`, [pinId]);
    for (const a of found) {
      await query(
        `INSERT INTO "PinAward" ("pinId", "body", "award", "year", "work", "result", "sourceUrl") VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [pinId, a.body, a.award.slice(0, 200), a.year, a.work.slice(0, 300), a.result, a.sourceUrl.slice(0, 500)],
      );
    }
  });
  return true;
}
