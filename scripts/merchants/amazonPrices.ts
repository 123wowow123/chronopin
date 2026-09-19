// Keeps the price on Amazon purchase links (Merchant rows) current by reading
// each product page's buy-box price. An unavailable listing loses its price
// (the link stays); a page that comes back as a robot check or with no
// readable price is left alone.
//
//   npm run merchants:amazon-prices                  list what would change
//   npm run merchants:amazon-prices -- --apply       change it
//   npm run merchants:amazon-prices -- --ids 213,160 --apply
//
// --ids are Merchant ids. Read the dry run's page titles: Amazon can redirect
// a listing to another variant. Then `npm run backup:data` to keep it in the
// seed data.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    ids: { type: 'string' },
    // Between pages, to stay clear of Amazon's robot check.
    pause: { type: 'string', default: '3000' },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html',
};

type Page =
  | { kind: 'price'; price: number; title: string }
  | { kind: 'unavailable'; title: string }
  | { kind: 'unknown'; reason: string };

export function readAmazonPage(html: string): Page {
  if (/captcha|api-services-support@amazon\.com/i.test(html) && !/id="productTitle"/.test(html)) {
    return { kind: 'unknown', reason: 'robot check' };
  }
  const title = (html.match(/id="productTitle"[^>]*>\s*([^<]*?)\s*</)?.[1] ?? '').replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
  // The buy box of the variant the page shows; other prices on the page belong
  // to related products.
  const buyBox = html.match(/twister-plus-buying-options-price-data">(\{.*?\})<\/div>/s)?.[1];
  if (buyBox) {
    try {
      const price = JSON.parse(buyBox).desktop_buybox_group_1?.[0]?.priceAmount;
      if (typeof price === 'number' && price > 0) return { kind: 'price', price, title };
    } catch {
      // Fall through to the availability check.
    }
  }
  if (/id="outOfStock"|Currently unavailable/.test(html)) return { kind: 'unavailable', title };
  return { kind: 'unknown', reason: title ? `no buy-box price (${title})` : 'no product on page' };
}

async function fetchPage(url: string): Promise<Page> {
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  if (res.status === 404) return { kind: 'unavailable', title: '(404)' };
  if (!res.ok) return { kind: 'unknown', reason: `HTTP ${res.status}` };
  return readAmazonPage(await res.text());
}

async function run() {
  const ids = flags.ids?.split(',').map(Number).filter(Number.isInteger);
  const rows = await db.query<{ id: number; pinId: number; url: string; price: string | null; pinTitle: string }>(
    `SELECT m."id", m."pinId", m."url", m."price", p."title" AS "pinTitle"
     FROM "Merchant" m JOIN "Pin" p ON p."id" = m."pinId"
     WHERE m."url" ~* '^https?://([a-z]+\\.)?amazon\\.com/' AND p."utcDeletedDateTime" IS NULL
       ${ids?.length ? 'AND m."id" = ANY($1::int[])' : ''}
     ORDER BY m."id"`,
    ids?.length ? [ids] : [],
  );
  console.log(`${flags.apply ? 'Updating' : 'Dry run over'} ${rows.length} Amazon links`);
  const totals = { changed: 0, same: 0, cleared: 0, skipped: 0 };

  for (const [i, row] of rows.entries()) {
    if (i) await sleep(Number(flags.pause));
    const old = row.price === null ? null : Number(row.price);
    let page: Page;
    try {
      page = await fetchPage(row.url);
    } catch (err) {
      page = { kind: 'unknown', reason: (err as Error).message };
    }
    const next = page.kind === 'price' ? page.price : page.kind === 'unavailable' ? null : old;
    const label = `${row.id} pin ${row.pinId} ${row.pinTitle}`;
    if (page.kind === 'unknown') {
      console.log(`${label}\n    skipped: ${page.reason}`);
      totals.skipped++;
      continue;
    }
    console.log(`${label}\n    "${page.title.slice(0, 90)}": ${old ?? '-'} -> ${next ?? 'unavailable'}`);
    if (next === old) {
      totals.same++;
      continue;
    }
    if (next === null) totals.cleared++;
    else totals.changed++;
    if (flags.apply) {
      await db.query(`UPDATE "Merchant" SET "price" = $1 WHERE "id" = $2`, [next, row.id]);
    }
  }
  console.log(
    `${flags.apply ? 'Saved' : 'Would save'} ${totals.changed} prices and clear ${totals.cleared}; ${totals.same} unchanged, ${totals.skipped} skipped`,
  );
}

run()
  .catch((err) => {
    console.log('Amazon prices err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
