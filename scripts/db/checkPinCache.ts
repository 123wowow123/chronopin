// Compares PinBaseCache (0072) with PinBaseView, which defines it: every
// pin's rows, as JSON, must match. The triggers keep the two together; this
// is how to know they did. Reading the whole view takes seconds.
//
//   npm run db:check-pin-cache              report pins that differ
//   npm run db:check-pin-cache -- --fix     and re-copy those pins
//   npm run db:check-pin-cache -- --rebuild rebuild the whole cache

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags } = parseArgs({
  options: { fix: { type: 'boolean', default: false }, rebuild: { type: 'boolean', default: false } },
});

// Each pin's rows as one sorted list of JSON texts: json has no equality
// operator, and a pin's rows are its media x merchants in any order.
const digest = (source: string) => `
  SELECT "id", array_agg(md5(row_to_json("r")::text) ORDER BY md5(row_to_json("r")::text)) AS "rows"
  FROM ${source} AS "r"
  GROUP BY "id"`;

async function run() {
  if (flags.rebuild) {
    await db.query('SELECT "pinBaseCacheRebuild"()');
    console.log('Rebuilt PinBaseCache');
    return;
  }
  const rows = await db.query<{ id: number; problem: string }>(`
    SELECT COALESCE("v"."id", "c"."id") AS "id",
           CASE WHEN "c"."id" IS NULL THEN 'missing from the cache'
                WHEN "v"."id" IS NULL THEN 'in the cache only'
                ELSE 'rows differ' END AS "problem"
    FROM (${digest('"PinBaseView"')}) AS "v"
      FULL JOIN (${digest('"PinBaseCache"')}) AS "c" ON "c"."id" = "v"."id"
    WHERE "v"."rows" IS DISTINCT FROM "c"."rows"
    ORDER BY 1`);
  if (!rows.length) {
    console.log('PinBaseCache matches PinBaseView');
    return;
  }
  for (const { id, problem } of rows.slice(0, 50)) console.log(`pin ${id}: ${problem}`);
  if (rows.length > 50) console.log(`... and ${rows.length - 50} more`);
  if (flags.fix) {
    await db.query('SELECT "pinBaseCacheRefresh"($1::integer[])', [rows.map((r) => r.id)]);
    console.log(`Re-copied ${rows.length} pin(s)`);
  } else {
    process.exitCode = 1;
  }
}

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
