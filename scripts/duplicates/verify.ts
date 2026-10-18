// Asks Claude whether suggested duplicate pairs are really one event, from
// both pins and their references, and records its verdict on each pair (see
// src/server/extract/duplicates.ts). A save does this for its own pin; this
// catches up on pairs suggested before, or while the API key had no credit.
//
//   npm run duplicates:verify                    undecided pairs with no verdict yet
//   npm run duplicates:verify -- --id 310        that pin's undecided pairs
//   npm run duplicates:verify -- --all           re-check every undecided pair
//   npm run duplicates:verify -- --dry-run       list the pairs, call nothing
//
// Each pair is one Claude call. Verdicts only advise: the pair stays suggested
// until someone confirms or rejects it.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { verifyDuplicate } from '@/server/services/duplicatePin';

const { values: flags } = parseArgs({
  options: { id: { type: 'string' }, all: { type: 'boolean' }, 'dry-run': { type: 'boolean' } },
});

async function run() {
  const pairs = await db.query<{ pinId: number; otherPinId: number; a: string; b: string }>(
    `SELECT "d"."pinId", "d"."otherPinId", "a"."title" AS "a", "b"."title" AS "b"
     FROM "PinDuplicate" AS "d"
       JOIN "Pin" AS "a" ON "a"."id" = "d"."pinId" AND "a"."utcDeletedDateTime" IS NULL
       JOIN "Pin" AS "b" ON "b"."id" = "d"."otherPinId" AND "b"."utcDeletedDateTime" IS NULL
     WHERE "d"."status" = 'suggested'
       AND ($1::integer IS NULL OR $1 IN ("d"."pinId", "d"."otherPinId"))
       AND ($2 OR "d"."verdict" IS NULL)
     ORDER BY "d"."pinId", "d"."otherPinId"`,
    [flags.id ? Number(flags.id) : null, !!flags.all],
  );

  let recorded = 0;
  for (const pair of pairs) {
    if (flags['dry-run']) {
      console.log(`${pair.pinId}/${pair.otherPinId}  ${pair.a}  |  ${pair.b}`);
      continue;
    }
    if (await verifyDuplicate(pair.pinId, pair.otherPinId)) {
      recorded++;
      const [row] = await db.query<{ verdict: string; verdictReasoning: string }>(
        `SELECT "verdict", "verdictReasoning" FROM "PinDuplicate" WHERE "pinId" = $1 AND "otherPinId" = $2`,
        [pair.pinId, pair.otherPinId],
      );
      console.log(`${pair.pinId}/${pair.otherPinId} ${row.verdict}: ${row.verdictReasoning}`);
    } else {
      console.log(`${pair.pinId}/${pair.otherPinId} no verdict (see the warning above)`);
    }
  }
  console.log(flags['dry-run'] ? `${pairs.length} pair(s) would be checked.` : `Checked ${pairs.length} pair(s), recorded ${recorded} verdict(s).`);
}

run()
  .catch((err) => {
    console.log('duplicates:verify failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
