// Merchandise for a film pin's ad slots (PinAd, src/server/model/pinAd.ts):
// the plush, toys, figures and sets that carry the film's own name, found in
// Amazon's search results. A hit has to name the whole film, be neither a disc
// nor a book (the disc is the pin's buy button, ./movieListing.ts), and
// already show the review bar the ads need; PinAd.add then reads the listing
// itself and applies the full gate (brand, stock, price).

import { MIN_AD_RATING, MIN_AD_REVIEWS } from '@/lib/adQuality';
import { isExactListing } from '@/lib/shopping';
import { searchAmazon } from './amazonSearch';
import { titleCandidates } from './scrape/screen';
import * as db from './db';
import PinAd from './model/pinAd';

const KINDS = ['plush', 'toy', 'Funko Pop', 'LEGO', 'action figure', 'costume'];
const NOT_MERCHANDISE = /\b(blu-?ray|dvd|4k|digital|soundtrack|cd|vinyl|book|novel|paperback|hardcover|dvd\/blu-ray|poster|sticker)\b/i;
const PAUSE_MS = 1500;

export type MerchandiseQuery = { pinId: number; workTitle?: string | null; pinTitle?: string | null; max?: number };

// Adds up to `max` (default 3) merchandise ads to the pin; returns what was added.
export async function addMovieMerchandise(query: MerchandiseQuery): Promise<{ asin: string; title: string }[]> {
  const title = titleCandidates(query)[0];
  if (!title) return [];
  const max = query.max ?? 3;
  const added: { asin: string; title: string }[] = [];
  const tried = new Set<string>();
  for (const kind of KINDS) {
    if (added.length >= max) break;
    const hits = await searchAmazon(`${title} ${kind}`);
    if ('unknown' in hits) continue;
    const hit = hits.find(
      (h) =>
        !h.sponsored && !tried.has(h.asin) && !NOT_MERCHANDISE.test(h.title) && isExactListing(title, h.title) &&
        (h.rating ?? 0) >= MIN_AD_RATING && (h.reviews ?? 0) >= MIN_AD_REVIEWS,
    );
    if (!hit) continue;
    tried.add(hit.asin);
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
    const result = await PinAd.add(query.pinId, `https://www.amazon.com/dp/${hit.asin}`);
    if ('added' in result) added.push({ asin: hit.asin, title: result.added.title });
  }
  return added;
}

// Film pins from the last 120 days to the next 45 with fewer than two working
// ads, the nearest to today first (or just `ids`), each given merchandise.
export async function stockMovieMerchandise({ ids, limit = 100, max = 3 }: { ids?: number[]; limit?: number; max?: number } = {}) {
  const rows = await db.query<{ id: number; title: string; productName: string | null }>(
    `SELECT "p"."id", "p"."title", "p"."productName" FROM "Pin" AS "p"
     WHERE "p"."utcDeletedDateTime" IS NULL
       AND EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."kind" = 'category' AND "t"."name" = 'Movie')
       AND (SELECT count(*) FROM "PinAd" AS "a" WHERE "a"."pinId" = "p"."id" AND "a"."status" = 'ok') < 2
       ${ids?.length ? 'AND "p"."id" = ANY($2::int[])' : `AND "p"."utcStartDateTime" >= now() - interval '120 days' AND "p"."utcStartDateTime" < now() + interval '45 days'`}
     ORDER BY abs(extract(epoch FROM "p"."utcStartDateTime" - now())) LIMIT $1`,
    ids?.length ? [limit, ids] : [limit],
  );
  const stocked: { pinId: number; title: string; added: { asin: string; title: string }[] }[] = [];
  for (const row of rows) stocked.push({ pinId: row.id, title: row.title, added: await addMovieMerchandise({ pinId: row.id, workTitle: row.productName, pinTitle: row.title, max }) });
  return stocked;
}
