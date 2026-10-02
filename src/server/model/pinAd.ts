import { adProblem, asinOf, listingUrl, sameBrand } from '@/lib/adQuality';
import * as db from '../db';
import { readAmazonListing } from '../listingPrice';
import log from '../util/log';

// Product ads chosen for one pin (0112): Amazon listings that suit it, well
// reviewed and from a trusted brand (src/lib/adQuality.ts), served first in
// that pin's ad slots (src/server/model/ad.ts). The pinAds job task adds them
// and keeps them alive; a listing that is gone, out of stock or below the bar
// is marked broken and never served.

export type PinAdRow = {
  id: number;
  pinId: number;
  asin: string;
  url: string;
  title: string;
  brand: string | null;
  price: number | null;
  rating: number | null;
  reviewCount: number | null;
  status: 'ok' | 'broken';
  problem: string | null;
  checkedAt: string;
};

const COLUMNS = `"id", "pinId", "asin", "url", "title", "brand", "price"::float8 AS "price", "rating"::float8 AS "rating", "reviewCount", "status", "problem",
  to_char("checkedDateTime" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "checkedAt"`;

// A check this recent is not repeated by the next run's sweep.
const RECHECK_HOURS = 11;
const PAUSE_MS = 1500;

export type AddResult = { added: PinAdRow; brandMatchesPin: boolean } | { rejected: string };

// Where the ad inventory and a page's own cache should pick up a change.
function touched() {
  const held = (globalThis as any).__chronopinAds;
  if (held) held.inventory = null;
}

export default class PinAd {
  static async forPin(pinId: number): Promise<PinAdRow[]> {
    return db.query<PinAdRow>(`SELECT ${COLUMNS} FROM "PinAd" WHERE "pinId" = $1 ORDER BY "status", "id"`, [pinId]);
  }

  // Reads the listing and adds it to the pin when it clears the bar. The
  // listing's brand is compared with the pin's company; a match is what the
  // pickers should prefer, but is not required (an event about a game suits
  // a console maker's gear too).
  static async add(pinId: number, link: string): Promise<AddResult> {
    const asin = asinOf(link);
    if (!asin) return { rejected: 'Not an amazon.com product link (/dp/<ASIN>).' };
    const pin = await db.query<{ company: string | null }>(
      `SELECT "c"."name"::text AS "company" FROM "Pin" AS "p" LEFT JOIN "Company" AS "c" ON "c"."id" = "p"."companyId"
       WHERE "p"."id" = $1 AND "p"."utcDeletedDateTime" IS NULL`,
      [pinId],
    );
    if (!pin.length) return { rejected: `No live pin ${pinId}.` };
    const url = listingUrl(asin);
    const listing = await readAmazonListing(url);
    if ('gone' in listing) return { rejected: 'Amazon has no such listing (404).' };
    if ('unknown' in listing) return { rejected: `The listing page could not be read (${listing.unknown}); try again later.` };
    const problem = adProblem(listing);
    if (problem) return { rejected: `${listing.brand ?? 'Unbranded'} "${listing.title.slice(0, 80)}": ${problem}.` };
    const rows = await db.query<PinAdRow>(
      `INSERT INTO "PinAd" ("pinId", "asin", "url", "title", "brand", "price", "rating", "reviewCount")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT ("pinId", "asin") DO UPDATE SET "title" = EXCLUDED."title", "brand" = EXCLUDED."brand", "price" = EXCLUDED."price",
         "rating" = EXCLUDED."rating", "reviewCount" = EXCLUDED."reviewCount", "status" = 'ok', "problem" = NULL, "checkedDateTime" = now()
       RETURNING ${COLUMNS}`,
      [pinId, asin, url, listing.title.slice(0, 300), listing.brand?.slice(0, 120) ?? null, listing.price, listing.rating, listing.reviewCount],
    );
    touched();
    return { added: rows[0], brandMatchesPin: sameBrand(listing.brand, pin[0].company) };
  }

  static async remove(pinId: number, asin: string): Promise<boolean> {
    const rows = await db.query(`DELETE FROM "PinAd" WHERE "pinId" = $1 AND "asin" = $2 RETURNING "id"`, [pinId, asin.toUpperCase()]);
    if (rows.length) touched();
    return rows.length > 0;
  }

  // Reads each ad's listing again (those not read in the last RECHECK_HOURS,
  // or all with `all`): the price and reviews are refreshed, and a listing
  // that is gone, out of stock or below the bar is marked broken. One that
  // was broken and clears the bar again is brought back. A page that cannot
  // be read (a robot check) changes nothing.
  static async check({ all = false, limit = 60 }: { all?: boolean; limit?: number } = {}) {
    const due = await db.query<{ id: number; pinId: number; url: string; status: string }>(
      `SELECT "a"."id", "a"."pinId", "a"."url", "a"."status" FROM "PinAd" AS "a"
         JOIN "Pin" AS "p" ON "p"."id" = "a"."pinId" AND "p"."utcDeletedDateTime" IS NULL
       WHERE $1::boolean OR "a"."checkedDateTime" < now() - make_interval(hours => $2::integer)
       ORDER BY "a"."checkedDateTime" LIMIT $3`,
      [all, RECHECK_HOURS, limit],
    );
    const broken: { pinId: number; adId: number; url: string; title: string; problem: string }[] = [];
    let ok = 0;
    let unread = 0;
    for (const [i, ad] of due.entries()) {
      if (i) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
      const listing = await readAmazonListing(ad.url);
      if ('unknown' in listing) {
        unread++;
        continue;
      }
      const problem = 'gone' in listing ? 'the listing no longer exists' : adProblem(listing);
      if (problem) {
        const rows = await db.query<{ title: string }>(
          `UPDATE "PinAd" SET "status" = 'broken', "problem" = $2, "checkedDateTime" = now() WHERE "id" = $1 RETURNING "title"`,
          [ad.id, problem],
        );
        // Only a listing that was working is news.
        if (ad.status === 'ok') broken.push({ pinId: ad.pinId, adId: ad.id, url: ad.url, title: rows[0]?.title ?? '', problem });
      } else if (!('gone' in listing)) {
        await db.query(
          `UPDATE "PinAd" SET "status" = 'ok', "problem" = NULL, "title" = $2, "brand" = $3, "price" = $4, "rating" = $5, "reviewCount" = $6, "checkedDateTime" = now() WHERE "id" = $1`,
          [ad.id, listing.title.slice(0, 300), listing.brand?.slice(0, 120) ?? null, listing.price, listing.rating, listing.reviewCount],
        );
        ok++;
      }
    }
    if (due.length) touched();
    log.info(`Pin ads checked: ${due.length} read, ${ok} ok, ${broken.length} newly broken, ${unread} unreadable`);
    return { checked: due.length, ok, unread, newlyBroken: broken };
  }

  // Pins worth an ad that have fewer than `want` working ones: the soonest
  // upcoming pins first, then the most opened. The job reads each and decides
  // whether a product genuinely suits it.
  static async needingAds({ want = 2, limit = 25 }: { want?: number; limit?: number } = {}) {
    return db.query<{ pinId: number; title: string; company: string | null; categories: string[]; working: number; start: string | null }>(
      `SELECT "p"."id" AS "pinId", "p"."title", "c"."name"::text AS "company",
         coalesce((SELECT array_agg("t"."name"::text ORDER BY "t"."id") FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."kind" = 'category'), '{}') AS "categories",
         (SELECT count(*)::int FROM "PinAd" AS "a" WHERE "a"."pinId" = "p"."id" AND "a"."status" = 'ok') AS "working",
         to_char("p"."utcStartDateTime" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "start"
       FROM "Pin" AS "p" LEFT JOIN "Company" AS "c" ON "c"."id" = "p"."companyId"
       WHERE "p"."utcDeletedDateTime" IS NULL AND "p"."utcStartDateTime" >= now() AND "p"."utcStartDateTime" < now() + interval '45 days'
         AND (SELECT count(*) FROM "PinAd" AS "a" WHERE "a"."pinId" = "p"."id" AND "a"."status" = 'ok') < $1
       ORDER BY (SELECT count(*) FROM "PinAd" AS "a" WHERE "a"."pinId" = "p"."id" AND "a"."status" = 'broken') DESC, "p"."utcStartDateTime" LIMIT $2`,
      [want, limit],
    );
  }
}
