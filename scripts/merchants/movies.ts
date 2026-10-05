// Gives existing film pins their buy buttons (src/server/movieListing.ts), as
// the scrape does for new ones: Fandango tickets while a film is in theaters,
// the Blu-ray/DVD on Amazon once it is out.
//
//   npm run merchants:movies                         what would change, every Movie pin lacking one
//   npm run merchants:movies -- --ids 6321,6322      these pins
//   npm run merchants:movies -- --apply              save the listings in this database
//   npm run merchants:movies -- --out movies.json    write [{pinId, merchants}] to post to another
//                                                    database's POST /api/pins/:id/merchants

import '../env';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Merchant from '@/server/model/merchant';
import { findMovieListings } from '@/server/movieListing';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    ids: { type: 'string' },
    out: { type: 'string' },
    pause: { type: 'string', default: '2000' },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const ids = flags.ids?.split(',').map(Number).filter(Number.isInteger);
  const rows = await db.query<{ id: number; title: string; start: Date; productName: string | null }>(
    `SELECT "Pin"."id", "Pin"."title", "Pin"."utcStartDateTime" AS "start", "Pin"."productName"
     FROM "Pin"
     WHERE "Pin"."utcDeletedDateTime" IS NULL
       AND EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "Pin"."id" AND "t"."kind" = 'category' AND "t"."name" = 'Movie')
       AND NOT EXISTS (SELECT 1 FROM "Merchant" AS "m" WHERE "m"."pinId" = "Pin"."id" AND ("m"."url" ILIKE '%fandango.com%' OR "m"."url" ILIKE '%amazon.com/dp/%'))
       ${ids?.length ? 'AND "Pin"."id" = ANY($1::int[])' : ''}
     ORDER BY "Pin"."id"`,
    ids?.length ? [ids] : [],
  );
  console.log(`${flags.apply ? 'Updating' : 'Dry run over'} ${rows.length} film pins without tickets or disc links`);
  const posts: { pinId: number; merchants: { label: string; url: string; price?: number }[] }[] = [];

  for (const row of rows) {
    const listings = await findMovieListings({ workTitle: row.productName, pinTitle: row.title, releaseDate: new Date(row.start) });
    if (!listings.length) continue;
    console.log(`${row.id} ${row.title}\n${listings.map((l) => `    ${l.label} ${l.url}${l.price ? ` $${l.price}` : ''}`).join('\n')}`);
    posts.push({ pinId: row.id, merchants: listings });
    if (flags.apply) await Merchant.saveAll(listings.map((l) => new Merchant(l)), row.id);
    await sleep(Number(flags.pause));
  }
  if (flags.out) writeFileSync(flags.out, JSON.stringify(posts, null, 2));
  console.log(`${flags.apply ? 'Saved' : 'Would save'} links for ${posts.length} pins`);
}

run()
  .catch((err) => {
    console.log('Movie listings err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
