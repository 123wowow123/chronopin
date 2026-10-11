// Links pins to the people they are about (PinPerson, 0150): a pin
// that carries a tag spelled exactly as the person's name. Titles are not
// matched - "Collins" in a headline is not always the senator.
//
//   npm run people:link-pins            local DB
//   npm run people:link-pins -- --dry-run
//
// Then `npm run backup:data`.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags } = parseArgs({ options: { 'dry-run': { type: 'boolean', default: false } } });

async function main() {
  const rows = await db.query<{ person: string; pins: number }>(
    `WITH "matches" AS (
       SELECT DISTINCT "po"."id" AS "personId", "po"."name", "t"."pinId"
       FROM "Person" AS "po"
       JOIN "PinTag" AS "t" ON lower("t"."name") = lower("po"."name")
       JOIN "Pin" ON "Pin"."id" = "t"."pinId" AND "Pin"."utcDeletedDateTime" IS NULL
     ), "inserted" AS (
       ${flags['dry-run'] ? `SELECT "personId", "pinId" FROM "matches"` : `INSERT INTO "PinPerson" ("pinId", "personId") SELECT "pinId", "personId" FROM "matches" ON CONFLICT DO NOTHING RETURNING "personId", "pinId"`}
     )
     SELECT "po"."name" AS "person", count(*)::int AS "pins" FROM "inserted" JOIN "Person" AS "po" ON "po"."id" = "inserted"."personId"
     GROUP BY "po"."name" ORDER BY 2 DESC, 1`,
  );
  for (const r of rows.slice(0, 25)) console.log(`${r.pins}\t${r.person}`);
  console.log(`${rows.length} people, ${rows.reduce((n, r) => n + r.pins, 0)} pin links ${flags['dry-run'] ? 'found' : 'made'}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
