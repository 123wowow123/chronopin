// Feeds every confirmed duplicate pair's newer pin into the older one, as
// confirming a pair now does (src/server/services/duplicateFeed.ts): pairs
// confirmed before that existed, or while it failed. Once per pair.
//
//   npm run duplicates:feed                 every confirmed pair
//   npm run duplicates:feed -- --id 3381    that pin's confirmed pairs
//   npm run duplicates:feed -- --dry-run    list the pairs, change nothing
//
// On prod the same happens through the API: PUT /api/pins/:id/duplicates/:otherId
// { status: 'confirmed' } again, as an admin or either pin's author.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { feedNewerDuplicate } from '@/server/services/duplicateFeed';
import { refreshPin } from '@/server/services/sourceWiki';

const { values: flags } = parseArgs({ options: { id: { type: 'string' }, 'dry-run': { type: 'boolean' } } });

async function run() {
  const pairs = await db.query<{ pinId: number; otherPinId: number; decidedByUserId: number | null; a: string; b: string }>(
    `SELECT "d"."pinId", "d"."otherPinId", "d"."decidedByUserId", "a"."title" AS "a", "b"."title" AS "b"
     FROM "PinDuplicate" AS "d"
       JOIN "Pin" AS "a" ON "a"."id" = "d"."pinId" AND "a"."utcDeletedDateTime" IS NULL
       JOIN "Pin" AS "b" ON "b"."id" = "d"."otherPinId" AND "b"."utcDeletedDateTime" IS NULL
     WHERE "d"."status" = 'confirmed' AND ($1::integer IS NULL OR $1 IN ("d"."pinId", "d"."otherPinId"))
     ORDER BY "d"."pinId", "d"."otherPinId"`,
    [flags.id ? Number(flags.id) : null],
  );
  let fed = 0;
  for (const pair of pairs) {
    if (flags['dry-run']) {
      console.log(`${pair.pinId}/${pair.otherPinId}  ${pair.a}  |  ${pair.b}`);
      continue;
    }
    const olderId = await feedNewerDuplicate(pair.pinId, pair.otherPinId, pair.decidedByUserId ?? 1);
    if (olderId) {
      fed++;
      // The save's own wiki refresh runs in the background; wait for it here.
      await refreshPin(olderId);
      console.log(`${pair.pinId}/${pair.otherPinId}: pin ${olderId} took in the newer pin's source`);
    }
  }
  console.log(flags['dry-run'] ? `${pairs.length} confirmed pair(s).` : `Fed ${fed} of ${pairs.length} confirmed pair(s).`);
}

run()
  .catch((err) => {
    console.log('duplicates:feed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
