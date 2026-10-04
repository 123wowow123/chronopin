// A pin's awards, after every save and by `npm run media:awards`. A film,
// series or anime is matched from the award catalogue (src/server/awards.ts)
// by the work's name; a game or a product from its Wikidata item
// (src/server/workAwards.ts). Derived data: a sync replaces the pin's rows.

import { matchAwards, type AwardEntry } from '@/lib/awards';
import { PIN_CATEGORIES } from '../model/pinTag';
import { hasCategory } from '@/lib/categories';
import { isScreenCategory, titleCandidates } from '../scrape/screen';
import { GAME_CATEGORIES } from '../scrape/scoreMarkets';
import { findWorkAwards } from '../workAwards';
import { awardCatalogue } from '../awards';
import * as db from '../db';

// The catalogue's entries for these titles (the pin's, or a scrape's work title).
export async function awardsFor(titles: (string | null | undefined)[]): Promise<AwardEntry[]> {
  const named = titles.filter((t): t is string => !!t?.trim());
  if (!named.length) return [];
  return matchAwards(await awardCatalogue(), named);
}

export type AwardedPin = { title: string; categories: string[]; productName?: string | null; year?: number; workTitle?: string | null };

// Every award a pin's work has: the catalogue's for a screen work, Wikidata's
// for a game or a product (a pin that names its product).
export async function awardsOfPin(pin: AwardedPin): Promise<AwardEntry[]> {
  if (isScreenCategory(pin.categories)) return awardsFor([pin.workTitle, pin.title]);
  const game = hasCategory(pin.categories, GAME_CATEGORIES);
  if (!game && !pin.productName?.trim()) return [];
  const titles = [pin.productName, pin.workTitle, ...titleCandidates({ pinTitle: pin.title })].filter((t): t is string => !!t?.trim());
  return findWorkAwards({ titles: [...new Set(titles)], year: pin.year, game });
}

// True when the pin's awards changed. `awards` when the caller has just looked
// them up. Throws when the lookup could not be made, leaving the stored rows.
export async function syncPinAwards(pinId: number, awards?: AwardEntry[]): Promise<boolean> {
  const [pin] = await db.query<{ title: string; categories: string[]; productName: string | null; start: Date }>(
    `SELECT "title", "productName", "utcStartDateTime" AS "start", ${PIN_CATEGORIES} AS "categories" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  const found = awards ?? (pin ? await awardsOfPin({ ...pin, year: new Date(pin.start).getUTCFullYear() }) : []);
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
