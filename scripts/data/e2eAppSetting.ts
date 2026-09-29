// Saves and restores one AppSetting row exactly - value, who set it and when,
// or its absence - around an e2e spec that has to change an admin setting
// (tests/e2e/i18n.spec.ts turns the site's languages on). Restoring through
// the admin route instead would sign the row with the throwaway admin and
// could not bring back "never set". Local runs only, like cleanE2e.ts; the
// server's own copy of a setting may take its cache time (30s) to follow.
//
//   npx tsx scripts/data/e2eAppSetting.ts get multilingual        prints the row as JSON, or null
//   npx tsx scripts/data/e2eAppSetting.ts put multilingual '<json>'  writes that row back (null deletes it)

import '../env';
import * as db from '@/server/db';

async function run() {
  const [command, key, json] = process.argv.slice(2);
  if (!key) throw new Error('usage: get|put <key> [json]');
  if (command === 'get') {
    const rows = await db.query(`SELECT "value", "userId", "utcUpdatedDateTime" FROM "AppSetting" WHERE "key" = $1`, [key]);
    console.log(JSON.stringify(rows[0] ?? null));
  } else if (command === 'put') {
    const row = JSON.parse(json ?? 'null');
    if (row === null) {
      await db.query(`DELETE FROM "AppSetting" WHERE "key" = $1`, [key]);
    } else {
      await db.query(
        `INSERT INTO "AppSetting" ("key", "value", "userId", "utcUpdatedDateTime") VALUES ($1, $2, $3, $4)
         ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "userId" = EXCLUDED."userId", "utcUpdatedDateTime" = EXCLUDED."utcUpdatedDateTime"`,
        [key, JSON.stringify(row.value), row.userId, row.utcUpdatedDateTime],
      );
    }
    console.log(`restored ${key}`);
  } else {
    throw new Error(`unknown command ${command}`);
  }
}

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
