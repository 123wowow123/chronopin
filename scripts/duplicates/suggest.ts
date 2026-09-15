// Suggests duplicate pins for review, the check a save runs, over existing pins.
//
//   npm run duplicates:suggest              every live pin
//   npm run duplicates:suggest -- --id 541  one pin
//
// Needs the search service (npm run search:refresh if it is empty). Suggested
// pairs show on the pin page to admins and the pins' authors; decided pairs
// are never changed.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { suggestDuplicates } from '@/server/services/duplicatePin';

const { values: flags } = parseArgs({ options: { id: { type: 'string' } } });

async function run() {
  const ids = flags.id
    ? [Number(flags.id)]
    : (await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL ORDER BY "id"`)).map((row) => row.id);
  let added = 0;
  for (const id of ids) {
    added += await suggestDuplicates(id);
  }
  const [counts] = await db.query<{ suggested: number; confirmed: number; rejected: number }>(`
    SELECT COUNT(*) FILTER (WHERE "status" = 'suggested')::integer AS "suggested",
           COUNT(*) FILTER (WHERE "status" = 'confirmed')::integer AS "confirmed",
           COUNT(*) FILTER (WHERE "status" = 'rejected')::integer AS "rejected"
    FROM "PinDuplicate"`);
  console.log(`Checked ${ids.length} pin(s), ${added} new suggestion(s). Now ${counts.suggested} suggested, ${counts.confirmed} confirmed, ${counts.rejected} rejected.`);
}

run()
  .catch((err) => {
    console.log('duplicates:suggest failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
