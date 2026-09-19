// Puts the film, series, anime and game pins that have no place of their own
// on the map at their studio's headquarters (src/server/studioLocation.ts).
// A save does this too; this is the backfill for pins from before.
//
//   npm run media:studio-locations                  list the pins it would place
//   npm run media:studio-locations -- --apply       place them
//   npm run media:studio-locations -- --pin 1635    just that pin (repeatable)
//
// A company's headquarters is looked up once (Wikipedia -> Wikidata) and kept
// on the company. Then `npm run backup:data` to keep it in the seed data.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { placeAtStudio, STUDIO_CATEGORIES } from '@/server/studioLocation';
import { PIN_CATEGORIES } from '@/server/model/pinTag';
import { hasCategory } from '@/lib/categories';

const { values: flags } = parseArgs({ options: { apply: { type: 'boolean', default: false }, pin: { type: 'string', multiple: true } } });

async function run() {
  const pins = await db.query<{ id: number; title: string; categories: string[] }>(
    `SELECT "id", "title", ${PIN_CATEGORIES} AS "categories" FROM "Pin"
     WHERE "utcDeletedDateTime" IS NULL AND "companyId" IS NOT NULL AND "location" IS NULL AND COALESCE("address", '') = ''
       AND ($1::integer[] IS NULL OR "id" = ANY($1::integer[])) ORDER BY "id"`,
    [flags.pin ? flags.pin.map(Number) : null],
  );
  const studio = pins.filter((pin) => hasCategory(pin.categories, STUDIO_CATEGORIES));
  let placed = 0;
  for (const pin of studio) {
    if (!flags.apply) {
      console.log(`pin ${pin.id} ${pin.title.slice(0, 60)}`);
      continue;
    }
    if (await placeAtStudio(pin.id)) placed++;
  }
  console.log(`${studio.length} studio pin(s) with no place${flags.apply ? `, ${placed} placed` : ' (dry run: add --apply)'}`);
}

run()
  .catch((err) => {
    console.log('media:studio-locations failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
