// Clears out what a Playwright run (tests/e2e) leaves in the database: the
// throwaway accounts it signs up, their pins and media, the rows anyone else's
// pins collected from them (watches, likes, views), the company a test pin
// named and nothing else uses, and those pins' entries in the search index.
//
//   npm run clean:e2e              remove it
//   npm run clean:e2e -- --dry-run say what it would remove
//
// Playwright runs this itself when a run finishes (playwright.config.ts). The
// app only soft-deletes a pin; this takes the rows out for good, which is what
// a development database wants of test residue.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { SearchPin } from '@/server/model/searchPin';
import { E2E_EMAIL } from './excludeE2e';

const { values: flags } = parseArgs({ options: { 'dry-run': { type: 'boolean', default: false } } });

// Where a row points at a pin or at the person who made it. Anything else the
// tests touch (a real pin's watch or view row) is named by one of these too.
const PIN_COLUMNS = ['pinId', 'otherPinId'];
const USER_COLUMNS = ['userId', 'followerId', 'followeeId', 'addedByUserId', 'decidedByUserId'];

async function main() {
  const users = (await db.query(`SELECT "id", "email" FROM "User"`)).filter(
    (user) => typeof user.email === 'string' && E2E_EMAIL.test(user.email),
  );
  const userIds = users.map((user) => user.id as number);
  if (!userIds.length) {
    console.log('No e2e test accounts in the database.');
    return;
  }
  const pins = await db.query(`SELECT "id", "companyId" FROM "Pin" WHERE "userId" = ANY($1)`, [userIds]);
  const pinIds = pins.map((pin) => pin.id as number);
  console.log(`${users.length} e2e account(s), ${pinIds.length} pin(s): ${users.map((u) => u.email).join(', ')}`);
  if (flags['dry-run']) {
    console.log('Dry run: nothing removed.');
    return;
  }

  // Out of the search index first: once the rows are gone there is nothing
  // left to say which pins these were. A search service that is down only
  // leaves entries whose pins have gone, which the next reseed clears.
  for (const id of pinIds) {
    await new SearchPin({ id }).delete().catch((err: Error) => console.warn(`  search remove failed for pin ${id}: ${err.message}`));
  }

  // The pictures and videos of those pins, before the rows that link them.
  const removed: string[] = [];
  const count = (table: string, rows: unknown[]) => rows.length && removed.push(`${table} ${rows.length}`);
  if (pinIds.length) {
    count(
      'Medium',
      await db.query(`DELETE FROM "Medium" WHERE "id" IN (SELECT "mediumId" FROM "PinMedium" WHERE "pinId" = ANY($1)) RETURNING "id"`, [pinIds]),
    );
  }

  for (const [table, column] of await columnsNaming([...PIN_COLUMNS, ...USER_COLUMNS])) {
    const ids = PIN_COLUMNS.includes(column) ? pinIds : userIds;
    if (!ids.length) continue;
    count(`${table}.${column}`, await db.query(`DELETE FROM "${table}" WHERE "${column}" = ANY($1) RETURNING 1`, [ids]));
  }

  count('Pin', await db.query(`DELETE FROM "Pin" WHERE "id" = ANY($1) RETURNING "id"`, [pinIds]));
  count('User', await db.query(`DELETE FROM "User" WHERE "id" = ANY($1) RETURNING "id"`, [userIds]));

  // A company only a test pin named. One that was already there unused stays.
  const companyIds = [...new Set(pins.map((pin) => pin.companyId).filter((id): id is number => id != null))];
  if (companyIds.length) {
    count(
      'Company',
      await db.query(`DELETE FROM "Company" WHERE "id" = ANY($1) AND NOT EXISTS (SELECT 1 FROM "Pin" WHERE "companyId" = "Company"."id") RETURNING "id"`, [
        companyIds,
      ]),
    );
  }
  console.log(`Removed: ${removed.join(', ') || 'nothing'}`);
}

// Every table (not view) with one of these columns, Pin and User themselves
// left to the deletes above.
async function columnsNaming(columns: string[]): Promise<[string, string][]> {
  const rows = await db.query(
    `SELECT c."table_name", c."column_name"
       FROM information_schema.columns c
       JOIN information_schema.tables t ON t."table_schema" = c."table_schema" AND t."table_name" = c."table_name"
      WHERE c."table_schema" = 'public' AND t."table_type" = 'BASE TABLE'
        AND c."column_name" = ANY($1) AND c."table_name" <> ALL(ARRAY['Pin', 'User'])
      ORDER BY c."table_name"`,
    [columns],
  );
  return rows.map((row) => [row.table_name as string, row.column_name as string]);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
