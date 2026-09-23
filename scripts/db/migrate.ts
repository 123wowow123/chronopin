// Applies the numbered schema files in scripts/db/schema to the database in
// DATABASE_URL, oldest first, each in its own transaction. Applied files are
// recorded in "schemaMigrations", so running this again only applies files
// added since.
//
//   npm run create:db      apply pending schema files
//   npm run db:reset       DROP every table, view and row, then apply them all
//                          (development only - refuses when NODE_ENV is
//                          production)
//
// A schema change is a new file, e.g. 0007_add_pin_foo.sql. Never edit a file
// that has already been applied somewhere.

import '../env';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as db from '@/server/db';

const SCHEMA_DIR = path.join(import.meta.dirname, 'schema');
const reset = process.argv.includes('--reset');

async function run() {
  if (reset) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('--reset refuses to run with NODE_ENV=production');
    }
    console.log('Dropping and recreating the public schema');
    // Extensions live in public too, so they go with it and the baseline file
    // recreates them.
    await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS "schemaMigrations" (
      "name"      varchar(255) PRIMARY KEY,
      "appliedAt" timestamptz NOT NULL DEFAULT now()
    )`);
  const applied = new Set((await db.query('SELECT "name" FROM "schemaMigrations"')).map((row) => row.name));
  const pending = readdirSync(SCHEMA_DIR)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort()
    .filter((file) => !applied.has(file));

  if (!pending.length) {
    console.log('No pending schema files');
  }
  let viewChanged = false;
  for (const file of pending) {
    console.log(`Applying ${file}`);
    const sql = readFileSync(path.join(SCHEMA_DIR, file), 'utf8');
    await db.transaction(async (query) => {
      await query(sql);
      await query('INSERT INTO "schemaMigrations" ("name") VALUES ($1)', [file]);
    });
    viewChanged ||= /VIEW\s+"PinBaseView"/.test(sql) && file >= '0072';
  }

  // PinBaseCache (0072) is PinBaseView materialized with the view's own
  // columns, so a file that redefines the view leaves it the old shape until
  // it is rebuilt - and the app reads the cache.
  if (viewChanged) {
    console.log('Rebuilding PinBaseCache for the new PinBaseView');
    await db.query('SELECT "pinBaseCacheRebuild"()');
  }
}

run()
  .then(() => console.log('Schema is up to date'))
  .catch((err) => {
    console.log('migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
