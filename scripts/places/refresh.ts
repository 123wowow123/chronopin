// Reads each resolved place's rating, rating count and opening state off its
// Google Maps page and stores them (PinPlace, 0060), so the pin page can show
// a score without a key and without paying for a browser on a page view.
//
//   npm run places:refresh                      list what would change
//   npm run places:refresh -- --apply           store it
//   npm run places:refresh -- --ids 2463 --apply
//   npm run places:refresh -- --hours 6 --apply    only rows read >6h ago
//
// READ THE DRY RUN. It prints the pin's title beside the name Google returned,
// which is the only way to catch a place id that resolved to the wrong branch
// of a chain - a wrong rating looks perfectly plausible.
//
// One browser at a time and a pause between places: this is Maps being
// scraped, not an API, and it is not urgent work. About five seconds a place.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import PinPlace from '@/server/model/pinPlace';
import { scrapeGooglePlace } from '@/server/placeScrape';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    ids: { type: 'string' },
    hours: { type: 'string', default: '24' },
    limit: { type: 'string', default: '200' },
    pause: { type: 'string', default: '2000' },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const ids = flags.ids?.split(',').map((id) => Number(id.trim())).filter(Boolean);
  const rows = ids?.length
    ? await db.query(
        `SELECT "pp"."pinId", "pp"."googlePlaceId", "pp"."googleRating", "pp"."checkedAt", "p"."title"
         FROM "PinPlace" AS "pp" JOIN "Pin" AS "p" ON "p"."id" = "pp"."pinId"
         WHERE "pp"."pinId" = ANY($1) AND "pp"."googlePlaceId" IS NOT NULL`,
        [ids],
      )
    : await PinPlace.staleGoogle(Number(flags.hours), Number(flags.limit));

  console.log(`${rows.length} place(s) to read   ${flags.apply ? 'APPLYING' : 'dry run'}\n`);
  let read = 0;
  let missed = 0;

  for (const row of rows) {
    const was = row.googleRating == null ? 'never' : `${row.googleRating} at ${row.checkedAt ?? '?'}`;
    let scraped;
    try {
      scraped = await scrapeGooglePlace(row.googlePlaceId);
    } catch (err) {
      console.log(`${row.pinId} "${row.title}" - browser failed: ${(err as Error).message.slice(0, 80)}`);
      missed++;
      continue;
    }

    if (!scraped || scraped.rating == null) {
      console.log(`${row.pinId} "${row.title}" - no rating on the page (was ${was})`);
      missed++;
      await sleep(Number(flags.pause));
      continue;
    }

    // Google's name for the place, so a wrong match is visible here.
    console.log(
      `${row.pinId} "${row.title}"\n` +
        `     google: ${scraped.name ?? '?'} - ${scraped.rating} (${scraped.ratingCount ?? '?'} ratings)` +
        `${scraped.hours ? ` - ${scraped.hours}` : ''}${scraped.busy ? ' - busy data!' : ''}\n` +
        `     was: ${was}`,
    );

    if (flags.apply) {
      // Reported per pin rather than left to kill the run. A type error in
      // this UPDATE once threw on every pin while the log still printed each
      // rating it had read, so the run looked like a success and stored
      // nothing.
      try {
        await PinPlace.setScraped(row.pinId, scraped);
      } catch (err) {
        console.log(`     NOT STORED: ${(err as Error).message}`);
        missed++;
        continue;
      }
    }
    read++;
    await sleep(Number(flags.pause));
  }

  console.log(`\n${read} read, ${missed} missed`);
  if (read && !flags.apply) {
    console.log('Dry run - nothing stored. Check the names above, then run again with --apply.');
  } else if (read) {
    console.log('Stored. Run `npm run backup:data` to keep it in the seed data.');
  }
}

run()
  .catch((err) => {
    console.log('places refresh err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
