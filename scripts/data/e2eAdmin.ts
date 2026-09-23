// Makes a throwaway e2e account (tests/e2e) an admin, for a spec that has to
// change an admin setting - the site's languages - and put it back. Only for
// addresses that look like the specs' own (E2E_EMAIL), and only where the
// script can reach the app's database: a local run, like cleanE2e.ts, which
// removes the account when the run ends.
//
//   npx tsx scripts/data/e2eAdmin.ts e2e-abc@example.com

import '../env';
import * as db from '@/server/db';
import { E2E_EMAIL } from './excludeE2e';

async function run() {
  const email = process.argv[2] ?? '';
  if (!E2E_EMAIL.test(email)) throw new Error(`${email || 'An email'} is not an e2e test address`);
  const rows = await db.query(`UPDATE "User" SET "role" = 'admin' WHERE "email" = $1 AND "utcDeletedDateTime" IS NULL RETURNING "id"`, [email]);
  if (!rows.length) throw new Error(`No account for ${email}`);
  console.log(`admin ${rows[0].id}`);
}

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
