import { isPurchaseLinkShown } from '@/lib/affiliate';
import { streamingService } from '@/lib/streaming';
import * as db from '../db';
import { readListingPrice, storeUrlOf, type AmazonStars, type PriceRead } from '../listingPrice';
import log from '../util/log';
import { expirePinPage } from './cache';

// Keeps the prices on stored listings (Merchant rows) current: once a day each
// purchase listing's store is read again (src/server/listingPrice.ts). A new
// price replaces the old; an item the store says is gone loses its price (the
// link stays); a store that does not answer leaves it alone. A price the store
// has not confirmed for a week is dropped, so a button never shows one long
// out of date, while a price given by hand for a store the refresh cannot
// read at all stays. An Amazon page's stars, reviews and brand are saved with
// its price, for the ad tile (0123).
//
// Runs in the server on the hour (startListingPriceRefresh, production only
// unless LISTING_PRICE_REFRESH=1), and by hand: `npm run merchants:prices`.

const DUE_AFTER_MS = 20 * 60 * 60 * 1000;
const STALE_DAYS = 7;
// A price that moves further than this either way is held for a person to
// look at: a page redirected to another variant, or read in another currency.
const MOST_CHANGE = 3;
// Between two requests to the same store; Amazon is quick to throttle.
const PAUSE_MS = { amazon: 6000, other: 1500 };
const CHECK_MS = 60 * 60 * 1000;
const PER_RUN = 300;

type Row = { id: number; pinId: number; url: string; price: string | null; title: string };

export type RefreshOptions = {
  apply: boolean;
  // Merchant ids to read whether or not they are due.
  ids?: number[];
  // Read every purchase listing, due or not.
  all?: boolean;
  limit?: number;
  report?: (line: string) => void;
};

export type RefreshTotals = { read: number; changed: number; cleared: number; same: number; review: number; unknown: number; stale: number };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function refreshListingPrices(options: RefreshOptions): Promise<RefreshTotals> {
  const report = options.report ?? (() => {});
  const rows = (
    await db.query<Row>(
      `SELECT "m"."id", "m"."pinId", "m"."url", "m"."price", "p"."title"
       FROM "Merchant" AS "m" JOIN "Pin" AS "p" ON "p"."id" = "m"."pinId" AND "p"."utcDeletedDateTime" IS NULL
       WHERE "m"."url" ~* '^https://'
         AND ($1::integer[] IS NOT NULL AND "m"."id" = ANY($1::integer[])
           OR $1::integer[] IS NULL AND ($2::boolean OR "m"."priceCheckedDateTime" IS NULL OR "m"."priceCheckedDateTime" < now() - make_interval(secs => $3::integer)))
       ORDER BY "m"."priceCheckedDateTime" NULLS FIRST, "m"."id"`,
      [options.ids?.length ? options.ids : null, !!options.all, DUE_AFTER_MS / 1000],
    )
  )
    // Watch-on links and dropped stores are never checked, so the limit
    // counts only the listings that are.
    .filter((row) => isPurchaseLinkShown(row.url) && !streamingService(row.url))
    .slice(0, options.limit);

  const totals: RefreshTotals = { read: 0, changed: 0, cleared: 0, same: 0, review: 0, unknown: 0, stale: 0 };
  const touched = new Set<number>();
  const lastAt = new Map<string, number>();

  for (const row of rows) {
    const host = storeUrlOf(row.url)?.hostname ?? '';
    const store = /(^|\.)amazon\.com$/i.test(host) ? 'amazon' : 'other';
    const wait = (lastAt.get(host) ?? 0) + PAUSE_MS[store] - Date.now();
    if (wait > 0) await sleep(wait);
    const read: PriceRead = await readListingPrice(row.url);
    lastAt.set(host, Date.now());
    totals.read++;

    const old = row.price === null ? null : Number(row.price);
    const label = `${row.id} pin ${row.pinId} ${host}`;
    let next = old;
    let seen = false;
    let stars: AmazonStars | null = null;
    let outcome: 'unknown' | 'review' | 'same' | 'changed' | 'cleared';
    if (read.kind === 'unknown') {
      outcome = 'unknown';
      report(`${label}: left alone (${read.reason})`);
    } else if (read.kind === 'unavailable') {
      next = null;
      seen = true;
      outcome = old === null ? 'same' : 'cleared';
    } else if (old !== null && (read.price > old * MOST_CHANGE || read.price * MOST_CHANGE < old)) {
      outcome = 'review';
      report(`${label}: ${old} -> ${read.price} held for review ("${read.title ?? ''}")`);
    } else {
      next = read.price;
      seen = true;
      // Only an Amazon page gives these; the key says whether it was read.
      if ('rating' in read) stars = { rating: read.rating ?? null, reviewCount: read.reviewCount ?? null, brand: read.brand ?? null };
      outcome = next === old ? 'same' : 'changed';
    }
    totals[outcome]++;
    if (outcome === 'changed' || outcome === 'cleared') report(`${label}: ${old ?? '-'} -> ${next ?? 'unavailable'} ("${read.kind !== 'unknown' ? (read.title ?? '') : ''}")`);
    if (options.apply) {
      await db.query(
        `UPDATE "Merchant" SET "price" = $2, "priceCheckedDateTime" = now(),
           "priceSeenDateTime" = CASE WHEN $3::boolean THEN now() ELSE "priceSeenDateTime" END,
           "rating" = CASE WHEN $4::boolean THEN $5::numeric ELSE "rating" END,
           "reviewCount" = CASE WHEN $4::boolean THEN $6::integer ELSE "reviewCount" END,
           "brand" = CASE WHEN $4::boolean THEN left($7::text, 120) ELSE "brand" END
         WHERE "id" = $1`,
        [row.id, next, seen, !!stars, stars?.rating ?? null, stars?.reviewCount ?? null, stars?.brand ?? null],
      );
      if (next !== old) touched.add(row.pinId);
    }
  }

  // A price its store has not confirmed for a week goes.
  const stale = await db.query<{ id: number; pinId: number }>(
    options.apply
      ? `UPDATE "Merchant" SET "price" = NULL
         WHERE "price" IS NOT NULL AND "priceSeenDateTime" < now() - make_interval(days => $1::integer)
         RETURNING "id", "pinId"`
      : `SELECT "id", "pinId" FROM "Merchant"
         WHERE "price" IS NOT NULL AND "priceSeenDateTime" < now() - make_interval(days => $1::integer)`,
    [STALE_DAYS],
  );
  for (const row of stale) {
    report(`${row.id} pin ${row.pinId}: price not confirmed for ${STALE_DAYS} days, dropped`);
    touched.add(row.pinId);
  }
  totals.stale = stale.length;

  if (options.apply) {
    for (const pinId of touched) {
      try {
        expirePinPage(pinId);
      } catch {
        // Outside a request (a script) there is no page cache to expire; the
        // page picks the price up when its cache runs out.
      }
    }
  }
  return totals;
}

const g = globalThis as unknown as { __chronopinListingPriceTimer?: ReturnType<typeof setInterval>; __chronopinListingPriceBusy?: boolean };

export function startListingPriceRefresh() {
  const setting = process.env.LISTING_PRICE_REFRESH;
  const on = setting ? setting === '1' : process.env.NODE_ENV === 'production';
  if (!on || g.__chronopinListingPriceTimer) return;
  const tick = async () => {
    if (g.__chronopinListingPriceBusy) return;
    g.__chronopinListingPriceBusy = true;
    try {
      const totals = await refreshListingPrices({ apply: true, limit: PER_RUN });
      if (totals.read || totals.stale) log.info('listing prices:', JSON.stringify(totals));
    } catch (err) {
      log.warn('listing price refresh failed:', (err as Error).message);
    } finally {
      g.__chronopinListingPriceBusy = false;
    }
  };
  g.__chronopinListingPriceTimer = setInterval(() => void tick(), CHECK_MS);
  g.__chronopinListingPriceTimer.unref();
  // Not at once: a deploy restarts the server, and the first hour's run can
  // wait for the site to settle.
}
