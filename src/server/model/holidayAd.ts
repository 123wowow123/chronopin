import { asinOf, holidayAdProblem, listingUrl, sameProductFamily } from '@/lib/adQuality';
import { AD_TIERS, holidayById, tierOf, WINDOW_AFTER_DAYS, WINDOW_BEFORE_DAYS, type AdTier, type HolidayDef } from '@/lib/culturalDays';
import * as db from '../db';
import { searchAmazon, type SearchHit } from '../amazonSearch';
import { holidaysInWindow, occurrencesIn } from '../culturalDays';
import { readAmazonListing } from '../listingPrice';
import log from '../util/log';

// Product ads for the cultural holidays (0121): the goods people traditionally
// buy for one, as Amazon listings that clear a bar for reviews and brand
// (holidayAdProblem), in the three price tiers of the holiday's own budget so
// a tile row can show an inexpensive, a middle and an expensive choice. They
// are served from a month before the holiday to three weeks after it
// (src/server/model/ad.ts). The news job's holidayAds task keeps them alive
// and stocks every holiday coming up; `npm run ads:holiday` does the same by hand.

export type HolidayAdRow = {
  id: number;
  holiday: string;
  asin: string;
  url: string;
  title: string;
  brand: string | null;
  price: number | null;
  rating: number | null;
  reviewCount: number | null;
  urgency: string | null;
  image: string | null;
  tier: AdTier;
  status: 'ok' | 'broken';
  problem: string | null;
  checkedAt: string;
};

const COLUMNS = `"id", "holiday", "asin", "url", "title", "brand", "price"::float8 AS "price", "rating"::float8 AS "rating", "reviewCount", "urgency", "image", "tier", "status", "problem",
  to_char("checkedDateTime" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "checkedAt"`;

// A check this recent is not repeated by the next run's sweep.
const RECHECK_HOURS = 11;
const PAUSE_MS = 1500;
// How many working ads each tier of a holiday is stocked to, and how many
// listings one run reads to get there.
const TIER_TARGET = 2;
const READS_PER_TIER = 4;
// Holidays are stocked this many days before their window opens, so the ads
// are there on its first day.
const STOCK_AHEAD_DAYS = 14;
// What a search result must show before its listing is read: a little under
// the bar itself, since the page rounds and a listing's own page decides.
const SEARCH_MIN_RATING = 4.0;
const SEARCH_MIN_REVIEWS = 5;
// A holiday outside its window is stocked only for the pins that fall on it
// (a pin's page shows its holiday's goods whatever the day); one run stocks at
// most this many of them, so the window's own holidays are never kept waiting.
const PIN_HOLIDAYS_PER_RUN = 3;

export type AddResult = { added: HolidayAdRow } | { rejected: string };
// How a search is run; Amazon's own (searchAmazon) unless a caller has a better way.
export type SearchFn = (query: string) => Promise<SearchHit[] | { unknown: string }>;

// Where the ad inventory should pick up a change.
function touched() {
  const held = (globalThis as any).__chronopinAds;
  if (held) held.inventory = null;
}

const todayUtc = () => new Date().toISOString().slice(0, 10);

// Words of a search that say nothing about what it is for.
const GENERIC_WORDS = new Set(['gift', 'gifts', 'set', 'sets', 'kit', 'box', 'festival', 'chinese', 'with', 'for', 'and', 'the', 'holiday', 'traditional']);

// Titles never advertised: supplements and cosmetics that merely share an
// ingredient with a holiday's food, and what Amazon or the owner rules out
// (alcohol, vapes, adult products, weapons).
const UNSUITABLE = /supplement|detox|capsule|\bpills?\b|shampoo|hair loss|\bliver\b|weight loss|vitamin|\bcbd\b|hemp|cannabis|alcohol|whiskey|vodka|\bwine\b|\bbeer\b|\bsake\b|vape|nicotine|cigar|sexy|lingerie|adult|\bknife\b|\bgun\b/i;

// Whether a search hit's title is about what the search asked for: it holds
// one of the search's own words (a "mooncake" search also lists Japanese
// sweets and pastries, none of them a mooncake).
export function onTopic(title: string, query: string): boolean {
  const lower = title.toLowerCase();
  const words = query
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !GENERIC_WORDS.has(w))
    .map((w) => w.replace(/s$/, ''));
  if (UNSUITABLE.test(title)) return false;
  return !words.length || words.some((w) => lower.includes(w) || (w === 'mooncake' && lower.includes('moon cake')));
}

// Whether a title names the holiday or one of its goods (the catalog's
// keywords for it); true for a holiday with none listed.
export const namesHoliday = (title: string, keywords: string[] = []) => !keywords.length || keywords.some((k) => title.toLowerCase().includes(k));

// How well a search hit suits an ad: stars weighed by how many people gave them.
const scoreOf = (hit: SearchHit) => (hit.rating ?? 0) * Math.log10((hit.reviews ?? 0) + 10);

export default class HolidayAd {
  static forHoliday(holiday: string): Promise<HolidayAdRow[]> {
    return db.query<HolidayAdRow>(`SELECT ${COLUMNS} FROM "HolidayAd" WHERE "holiday" = $1 ORDER BY "status", "tier", "id"`, [holiday]);
  }

  // Reads the listing and adds it to the holiday when it clears the bar. The
  // price decides the tier (the holiday's budget in the catalog).
  static async add(holiday: string, link: string): Promise<AddResult> {
    const def = holidayById(holiday);
    if (!def?.shop) return { rejected: `${holiday} is not a holiday with ads to run (the catalog, src/lib/culturalDays.ts, gives it no shop searches).` };
    const asin = asinOf(link);
    if (!asin) return { rejected: 'Not an amazon.com product link (/dp/<ASIN>).' };
    const url = listingUrl(asin);
    const listing = await readAmazonListing(url);
    if ('gone' in listing) return { rejected: 'Amazon has no such listing (404).' };
    if ('unknown' in listing) return { rejected: `The listing page could not be read (${listing.unknown}); try again later.` };
    const problem = holidayAdProblem(listing);
    if (problem) return { rejected: `${listing.brand ?? 'Unbranded'} "${listing.title.slice(0, 80)}": ${problem}.` };
    // One of a product's variants per holiday (the single, not also its 2- and 8-pack).
    const variantOf = (await HolidayAd.forHoliday(holiday)).find((ad) => ad.asin !== asin && sameProductFamily(ad, listing));
    if (variantOf) return { rejected: `"${listing.title.slice(0, 80)}" is a variant of ${variantOf.asin} "${variantOf.title.slice(0, 80)}", already an ad for ${holiday}; pick a different product.` };
    const rows = await db.query<HolidayAdRow>(
      `INSERT INTO "HolidayAd" ("holiday", "asin", "url", "title", "brand", "price", "rating", "reviewCount", "image", "tier", "urgency")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT ("holiday", "asin") DO UPDATE SET "title" = EXCLUDED."title", "brand" = EXCLUDED."brand", "price" = EXCLUDED."price",
         "rating" = EXCLUDED."rating", "reviewCount" = EXCLUDED."reviewCount", "image" = EXCLUDED."image", "tier" = EXCLUDED."tier", "urgency" = EXCLUDED."urgency",
         "status" = 'ok', "problem" = NULL, "checkedDateTime" = now()
       RETURNING ${COLUMNS}`,
      [holiday, asin, url, listing.title.slice(0, 300), listing.brand?.slice(0, 120) ?? null, listing.price, listing.rating, listing.reviewCount, listing.image ?? null, tierOf(listing.price as number, def.shop.budget), listing.urgency ?? null],
    );
    touched();
    return { added: rows[0] };
  }

  static async remove(holiday: string, asin: string): Promise<boolean> {
    const rows = await db.query(`DELETE FROM "HolidayAd" WHERE "holiday" = $1 AND "asin" = $2 RETURNING "id"`, [holiday, asin.toUpperCase()]);
    if (rows.length) touched();
    return rows.length > 0;
  }

  // Reads each ad's listing again (those not read in the last RECHECK_HOURS,
  // or all with `all`): price, reviews, picture and tier are refreshed, and a
  // listing that is gone, out of stock or below the bar is marked broken. A
  // broken one that clears the bar again is brought back. A page that cannot
  // be read (a robot check) changes nothing.
  static async check({ all = false, limit = 60 }: { all?: boolean; limit?: number } = {}) {
    const due = await db.query<{ id: number; holiday: string; url: string; status: string }>(
      `SELECT "id", "holiday", "url", "status" FROM "HolidayAd"
       WHERE $1::boolean OR "checkedDateTime" < now() - make_interval(hours => $2::integer)
       ORDER BY "checkedDateTime" LIMIT $3`,
      [all, RECHECK_HOURS, limit],
    );
    const broken: { holiday: string; adId: number; url: string; title: string; problem: string }[] = [];
    let ok = 0;
    let unread = 0;
    for (const [i, ad] of due.entries()) {
      if (i) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
      const listing = await readAmazonListing(ad.url);
      if ('unknown' in listing) {
        unread++;
        continue;
      }
      const problem = 'gone' in listing ? 'the listing no longer exists' : holidayAdProblem(listing);
      if (problem) {
        const rows = await db.query<{ title: string }>(
          `UPDATE "HolidayAd" SET "status" = 'broken', "problem" = $2, "checkedDateTime" = now() WHERE "id" = $1 RETURNING "title"`,
          [ad.id, problem],
        );
        if (ad.status === 'ok') broken.push({ holiday: ad.holiday, adId: ad.id, url: ad.url, title: rows[0]?.title ?? '', problem });
      } else if (!('gone' in listing)) {
        const budget = holidayById(ad.holiday)?.shop?.budget;
        await db.query(
          `UPDATE "HolidayAd" SET "status" = 'ok', "problem" = NULL, "title" = $2, "brand" = $3, "price" = $4, "rating" = $5, "reviewCount" = $6,
             "image" = coalesce($7, "image"), "tier" = coalesce($8, "tier"), "urgency" = $9, "checkedDateTime" = now() WHERE "id" = $1`,
          [ad.id, listing.title.slice(0, 300), listing.brand?.slice(0, 120) ?? null, listing.price, listing.rating, listing.reviewCount, listing.image ?? null, budget && listing.price != null ? tierOf(listing.price, budget) : null, listing.urgency ?? null],
        );
        ok++;
      }
    }
    if (due.length) touched();
    log.info(`Holiday ads checked: ${due.length} read, ${ok} ok, ${broken.length} newly broken, ${unread} unreadable`);
    return { checked: due.length, ok, unread, newlyBroken: broken };
  }

  // The holidays to have ads for: those whose ad window is open or opens within
  // STOCK_AHEAD_DAYS, then any other that a pin falls on (which a pin's page
  // advertises whenever it is viewed), with how many working ads each price
  // tier has.
  static async coverage(today = todayUtc()) {
    const reaching = holidaysInWindow(today, WINDOW_BEFORE_DAYS + STOCK_AHEAD_DAYS, WINDOW_AFTER_DAYS).filter((h) => holidayById(h.id)?.shop);
    const inWindow = new Set(reaching.map((h) => h.id));
    const rows = await db.query<{ holiday: string; tier: AdTier; count: number }>(
      `SELECT "holiday", "tier", count(*)::int AS "count" FROM "HolidayAd" WHERE "status" = 'ok' GROUP BY "holiday", "tier"`,
    );
    const describe = (id: string, start: string | null, daysFromStart: number | null, reason: 'window' | 'pins') => {
      const def = holidayById(id) as HolidayDef;
      const tiers = Object.fromEntries(AD_TIERS.map((tier) => [tier, rows.find((r) => r.holiday === id && r.tier === tier)?.count ?? 0])) as Record<AdTier, number>;
      return { id, name: def.name, start, daysFromStart, reason, tiers, short: AD_TIERS.filter((tier) => tiers[tier] < TIER_TARGET) };
    };
    const pinHolidays = (await HolidayAd.holidaysWithPins()).filter((id) => !inWindow.has(id));
    return [...reaching.map((h) => describe(h.id, h.start, h.offset, 'window')), ...pinHolidays.map((id) => describe(id, null, null, 'pins'))];
  }

  // The catalog holidays (with ads to run) that at least one pin starts on,
  // on any year's occurrence, the ones with the fewest working ads first.
  static async holidaysWithPins(): Promise<string[]> {
    const rows = await db.query<{ day: string }>(
      `SELECT DISTINCT to_char("utcStartDateTime" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "day" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND "utcStartDateTime" IS NOT NULL`,
    );
    const days = new Set(rows.map((r) => r.day));
    if (!days.size) return [];
    const years = [...days].map((d) => Number(d.slice(0, 4)));
    const found = new Set<string>();
    for (let year = Math.min(...years); year <= Math.max(...years); year++) {
      for (const o of occurrencesIn(year)) {
        if (found.has(o.def.id) || !o.def.shop) continue;
        for (let at = Date.parse(`${o.start}T00:00:00Z`); at <= Date.parse(`${o.end}T00:00:00Z`); at += 86400000) {
          if (days.has(new Date(at).toISOString().slice(0, 10))) {
            found.add(o.def.id);
            break;
          }
        }
      }
    }
    return [...found];
  }

  // What Amazon lists for the holiday's searches, split into its price tiers:
  // the shortlist `fill` reads, best-reviewed first, without what is already
  // an ad. Sponsored results and ones with no price are left out.
  static async candidates(holiday: string, search: SearchFn = searchAmazon): Promise<{ byTier: Record<AdTier, SearchHit[]>; problems: string[] }> {
    const def = holidayById(holiday);
    const byTier: Record<AdTier, SearchHit[]> = { value: [], mid: [], premium: [] };
    const problems: string[] = [];
    if (!def?.shop) return { byTier, problems: [`${holiday} has no shop searches`] };
    const have = new Set((await db.query<{ asin: string }>(`SELECT "asin" FROM "HolidayAd" WHERE "holiday" = $1`, [holiday])).map((r) => r.asin));
    const seen = new Set<string>();
    // Each search's own shortlist per tier, best first; they are dealt out one
    // from each search in turn, so the holiday's headline goods (mooncakes)
    // are not crowded out by whichever search has the best-reviewed hits.
    const perQuery: Record<AdTier, SearchHit[][]> = { value: [], mid: [], premium: [] };
    for (const [i, query] of def.shop.queries.entries()) {
      if (i) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
      const hits = await search(query);
      if ('unknown' in hits) {
        problems.push(`"${query}": ${hits.unknown}`);
        continue;
      }
      const mine: Record<AdTier, SearchHit[]> = { value: [], mid: [], premium: [] };
      for (const hit of hits) {
        if (hit.sponsored || hit.price == null || have.has(hit.asin) || seen.has(hit.asin)) continue;
        if ((hit.rating ?? 0) < SEARCH_MIN_RATING || (hit.reviews ?? 0) < SEARCH_MIN_REVIEWS || !onTopic(hit.title, query) || !namesHoliday(hit.title, def.shop.keywords)) continue;
        seen.add(hit.asin);
        mine[tierOf(hit.price, def.shop.budget)].push(hit);
      }
      for (const tier of AD_TIERS) perQuery[tier].push(mine[tier].sort((a, b) => scoreOf(b) - scoreOf(a)));
    }
    for (const tier of AD_TIERS) {
      const lists = perQuery[tier];
      for (let round = 0; lists.some((list) => round < list.length); round++) for (const list of lists) if (list[round]) byTier[tier].push(list[round]);
    }
    return { byTier, problems };
  }

  // Stocks the holidays coming up: each price tier short of TIER_TARGET gets
  // the best of what the holiday's searches list, each read and held to the
  // bar by `add`. Answers what was added and what a tier still lacks.
  static async fill({ only, today = todayUtc(), search }: { only?: string; today?: string; search?: SearchFn } = {}) {
    const added: { holiday: string; tier: AdTier; title: string; price: number | null; rating: number | null; reviews: number | null }[] = [];
    const lacking: { holiday: string; tier: AdTier; why: string }[] = [];
    const problems: string[] = [];
    const short = (await HolidayAd.coverage(today)).filter((h) => h.short.length && (!only || h.id === only));
    // The window's holidays all; the pin-only ones the emptiest few, a run.
    const wanted = [...short.filter((h) => h.reason === 'window'), ...(only ? short.filter((h) => h.reason === 'pins') : short.filter((h) => h.reason === 'pins').sort((a, b) => b.short.length - a.short.length).slice(0, PIN_HOLIDAYS_PER_RUN))];
    for (const h of wanted) {
      const { byTier, problems: searchProblems } = await HolidayAd.candidates(h.id, search);
      problems.push(...searchProblems.map((p) => `${h.id} ${p}`));
      for (const tier of h.short) {
        let have = h.tiers[tier];
        let reads = 0;
        const refused: string[] = [];
        for (const hit of byTier[tier]) {
          if (have >= TIER_TARGET || reads >= READS_PER_TIER) break;
          reads++;
          await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
          const result = await HolidayAd.add(h.id, listingUrl(hit.asin));
          if ('added' in result) {
            have++;
            added.push({ holiday: h.id, tier, title: result.added.title, price: result.added.price, rating: result.added.rating, reviews: result.added.reviewCount });
          } else refused.push(result.rejected);
        }
        if (have < TIER_TARGET) lacking.push({ holiday: h.id, tier, why: refused.length ? refused.slice(0, 2).join('; ') : byTier[tier].length ? 'none read' : 'no search result in this price range clears the bar' });
      }
    }
    log.info(`Holiday ads stocked: ${added.length} added, ${lacking.length} tiers still short`);
    return { added, lacking, problems };
  }
}
