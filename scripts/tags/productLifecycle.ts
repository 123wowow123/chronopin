// Adds the Announced and Released tags to every goods pin: a live pin with a
// productName on one of the /products shelves (or tagged Product), leaving out
// restaurants, films and events the way Products.shelfIds does. Keeps the
// tags a curator typed. Announced goes on all of them; Released only on those
// whose start date has come, and comes off a pin still to launch.
//
//   npx tsx scripts/tags/productLifecycle.ts             write
//   npx tsx scripts/tags/productLifecycle.ts --dry-run   just count

import '../env';
import { parseArgs } from 'node:util';
import { PRODUCT_SHELVES } from '@/lib/products';
import * as db from '@/server/db';
import PinTag from '@/server/model/pinTag';

const { values: flags } = parseArgs({ options: { 'dry-run': { type: 'boolean', default: false } } });
const NOT_GOODS = ['Restaurant', 'Restaurant Opening', 'Top Restaurants', 'Movie', 'Festival', 'Conference'];

async function run() {
  const pins = await db.query<{ id: number; out: boolean }>(
    `SELECT "p"."id", "p"."utcStartDateTime" <= now() AS "out" FROM "Pin" AS "p"
     WHERE "p"."utcDeletedDateTime" IS NULL AND nullif("p"."productName", '') IS NOT NULL
       AND EXISTS (SELECT 1 FROM "PinTagView" AS "c" WHERE "c"."pinId" = "p"."id" AND "c"."kind" <> 'reserved' AND "c"."name" = ANY($1::citext[]))
       AND NOT EXISTS (SELECT 1 FROM "PinTagView" AS "x" WHERE "x"."pinId" = "p"."id" AND "x"."name" = ANY($2::citext[]))
     ORDER BY "p"."id"`,
    [[...PRODUCT_SHELVES.map((s) => s.name), 'Product'], NOT_GOODS],
  );
  console.log(`${pins.length} goods pins`);
  if (flags['dry-run']) return;
  let changed = 0;
  for (const pin of pins) {
    if (pin.out) {
      if (await PinTag.addUserTags(pin.id, ['Announced', 'Released'])) changed++;
      continue;
    }
    const stored = await db.query<{ name: string }>(
      `SELECT "name"::text AS "name" FROM "PinTag" WHERE "pinId" = $1 AND "source" = 'user' AND "kind" <> 'category' ORDER BY "id"`,
      [pin.id],
    );
    const names = stored.map((r) => r.name).filter((n) => n !== 'Released');
    if (!names.includes('Announced')) names.push('Announced');
    if (await PinTag.setUserTags(pin.id, names)) changed++;
  }
  console.log(`${changed} pins gained a tag`);
}

run().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
