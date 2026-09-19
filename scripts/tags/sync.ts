// Pin tags for the awards pins' own descriptions and summaries name, and the
// prediction markets (Kalshi, Polymarket) their links cite (src/server/model/pinTag.ts). Every save does this too; this is the
// backfill, and the catch-up after the award detector changes. The award
// bodies' own tags need no backfill: they follow PinAward (npm run media:awards).
//
//   npm run tags:sync                  every live pin
//   npm run tags:sync -- --pin 1780    just that pin (repeatable)
//   npm run tags:sync -- --dry-run     list what would be written

import '../env';
import { parseArgs } from 'node:util';
import { autoTags } from '@/lib/tags';
import * as db from '@/server/db';
import PinTag from '@/server/model/pinTag';

const { values: flags } = parseArgs({ options: { pin: { type: 'string', multiple: true }, 'dry-run': { type: 'boolean', default: false } } });

async function run() {
  const pins = await db.query<{ id: number; title: string }>(
    `SELECT "id", "title" FROM "Pin"
     WHERE "utcDeletedDateTime" IS NULL AND ($1::integer[] IS NULL OR "id" = ANY($1::integer[])) ORDER BY "id"`,
    [flags.pin ? flags.pin.map(Number) : null],
  );
  let tagged = 0;
  let changed = 0;
  for (const pin of pins) {
    const source = await PinTag.autoSource(pin.id);
    const found = source ? autoTags(source) : [];
    if (found.length) {
      tagged++;
      console.log(`pin ${pin.id} ${pin.title.slice(0, 50)}: ${found.join(' | ')}`);
    }
    if (!flags['dry-run'] && (await PinTag.syncAutoTags(pin.id))) changed++;
  }
  console.log(`${pins.length} pin(s), ${tagged} with auto tags${flags['dry-run'] ? ' (dry run)' : `, ${changed} changed`}`);
}

run()
  .catch((err) => {
    console.log('tags:sync failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
