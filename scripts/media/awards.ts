// Awards for film, series and anime pins (src/server/services/pinAwards.ts):
// matches every such pin against the award bodies' Wikipedia pages. Pins sync
// on every save too; this is the backfill, and the catch-up after an award
// season adds winners.
//
//   npm run media:awards                  every film, series and anime pin
//   npm run media:awards -- --pin 1780    just that pin (repeatable)
//   npm run media:awards -- --dry-run     list what would be written

import '../env';
import { parseArgs } from 'node:util';
import { inCategories } from '@/server/model/pinTag';
import * as db from '@/server/db';
import { SCREEN_CATEGORIES } from '@/server/scrape/screen';
import { awardCatalogue } from '@/server/awards';
import { awardsFor, syncPinAwards } from '@/server/services/pinAwards';

const { values: flags } = parseArgs({ options: { pin: { type: 'string', multiple: true }, 'dry-run': { type: 'boolean', default: false } } });

async function run() {
  const catalogue = await awardCatalogue();
  console.log(`catalogue: ${catalogue.length} award entries`);
  const pins = await db.query<{ id: number; title: string }>(
    `SELECT "id", "title" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND ${flags.pin ? `"id" = ANY($1::integer[])` : inCategories('$1')} ORDER BY "id"`,
    [flags.pin ? flags.pin.map(Number) : SCREEN_CATEGORIES],
  );
  let withAwards = 0;
  let changed = 0;
  for (const pin of pins) {
    const found = await awardsFor([pin.title]);
    if (found.length) {
      withAwards++;
      const won = found.filter((a) => a.result === 'won');
      console.log(`pin ${pin.id} ${pin.title.slice(0, 50)}: ${won.length} won, ${found.length - won.length} nominated${won[0] ? ` (e.g. ${won[0].body} ${won[0].award} ${won[0].year}, for ${won[0].work})` : ''}`);
    }
    if (!flags['dry-run'] && (await syncPinAwards(pin.id))) changed++;
  }
  console.log(`${pins.length} pin(s), ${withAwards} with awards${flags['dry-run'] ? ' (dry run)' : `, ${changed} changed`}`);
}

run()
  .catch((err) => {
    console.log('media:awards failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
