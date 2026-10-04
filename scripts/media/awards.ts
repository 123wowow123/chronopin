// Awards for film, series, anime, game and product pins
// (src/server/services/pinAwards.ts): a screen work is matched against the
// award bodies' Wikipedia pages, a game or a product against its Wikidata
// item. Pins sync on every save too; this is the backfill, and the catch-up
// after an award season adds winners.
//
//   npm run media:awards                  every film, series, anime, game and product pin
//   npm run media:awards -- --pin 1780    just that pin (repeatable)
//   npm run media:awards -- --dry-run     list what would be written

import '../env';
import { parseArgs } from 'node:util';
import { inCategories, PIN_CATEGORIES } from '@/server/model/pinTag';
import * as db from '@/server/db';
import { SCREEN_CATEGORIES } from '@/server/scrape/screen';
import { GAME_CATEGORIES } from '@/server/scrape/scoreMarkets';
import { awardCatalogue } from '@/server/awards';
import { awardsOfPin, syncPinAwards } from '@/server/services/pinAwards';

const { values: flags } = parseArgs({ options: { pin: { type: 'string', multiple: true }, 'dry-run': { type: 'boolean', default: false } } });

async function run() {
  const catalogue = await awardCatalogue();
  console.log(`catalogue: ${catalogue.length} award entries`);
  const pins = await db.query<{ id: number; title: string; productName: string | null; start: Date; categories: string[] }>(
    `SELECT "id", "title", "productName", "utcStartDateTime" AS "start", ${PIN_CATEGORIES} AS "categories" FROM "Pin"
     WHERE "utcDeletedDateTime" IS NULL
       AND ${flags.pin ? `"id" = ANY($1::integer[])` : `(${inCategories('$1')} OR COALESCE("productName", '') <> '')`}
     ORDER BY "id"`,
    [flags.pin ? flags.pin.map(Number) : [...SCREEN_CATEGORIES, ...GAME_CATEGORIES]],
  );
  let withAwards = 0;
  let changed = 0;
  let failed = 0;
  for (const pin of pins) {
    // Wikidata's query service rate-limits a run that asks for every pin at once.
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      const found = await awardsOfPin({ ...pin, year: new Date(pin.start).getUTCFullYear() });
      if (found.length) {
        withAwards++;
        const won = found.filter((a) => a.result === 'won');
        console.log(`pin ${pin.id} ${pin.title.slice(0, 50)}: ${won.length} won, ${found.length - won.length} nominated${won[0] ? ` (e.g. ${won[0].body} ${won[0].award} ${won[0].year}, for ${won[0].work})` : ''}`);
      }
      if (!flags['dry-run'] && (await syncPinAwards(pin.id, found))) changed++;
    } catch (err) {
      // An outage is not "no awards": the pin keeps what it has.
      failed++;
      console.log(`pin ${pin.id} skipped: ${(err as Error).message}`);
    }
  }
  console.log(`${pins.length} pin(s), ${withAwards} with awards${flags['dry-run'] ? ' (dry run)' : `, ${changed} changed`}${failed ? `, ${failed} skipped by a failed lookup (run again)` : ''}`);
}

run()
  .catch((err) => {
    console.log('media:awards failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
