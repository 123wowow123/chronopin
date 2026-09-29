// Prints the id of a pin a Playwright spec can list an item for sale on
// (0095): one that names a product and sells as an item, not a vehicle, a
// home or a job. Local runs only, like the other e2e helpers.
//
//   npx tsx scripts/data/e2eProductPin.ts

import '../env';
import * as db from '@/server/db';

async function run() {
  const [pin] = await db.query<{ id: number }>(
    `SELECT "p"."id" FROM "Pin" AS "p"
     WHERE "p"."productName" IS NOT NULL AND "p"."utcDeletedDateTime" IS NULL
       AND NOT EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."kind" = 'category' AND "t"."name" IN ('Automotive', 'Property', 'Labour'))
     ORDER BY "p"."id" DESC LIMIT 1`,
  );
  if (!pin) throw new Error('No product pin to list on');
  console.log(String(pin.id));
}

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
