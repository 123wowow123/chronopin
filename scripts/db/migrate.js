'use strict';

// Applies the numbered schema files in scripts/db/schema to the database in
// DATABASE_URL (or the environment config), oldest first, each in its own
// transaction. Applied files are recorded in "schemaMigrations", so running
// this again only applies files added since.
//
//   npm run create:db      apply pending schema files
//   npm run db:reset       DROP every table, view and row, then apply them all
//                          (development only - refuses when NODE_ENV is
//                          production)
//
// A schema change is a new file, e.g. 0002_add_pin_foo.sql. Never edit a file
// that has already been applied somewhere.

require('@babel/register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const fs = require('fs');
const path = require('path');
const db = require('../../server/db');

const SCHEMA_DIR = path.join(__dirname, 'schema');
const reset = process.argv.indexOf('--reset') !== -1;

run()
  .then(() => {
    console.log('Schema is up to date');
  })
  .catch(err => {
    console.log('migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());

function run() {
  return (reset ? resetSchema() : Promise.resolve())
    .then(() => db.query(`
      CREATE TABLE IF NOT EXISTS "schemaMigrations" (
        "name"      varchar(255) PRIMARY KEY,
        "appliedAt" timestamptz NOT NULL DEFAULT now()
      )`))
    .then(() => db.query('SELECT "name" FROM "schemaMigrations"'))
    .then(rows => {
      const applied = new Set(rows.map(row => row.name));
      const pending = fs.readdirSync(SCHEMA_DIR)
        .filter(file => /^\d+_.+\.sql$/.test(file))
        .sort()
        .filter(file => !applied.has(file));

      if (!pending.length) {
        console.log('No pending schema files');
      }
      return pending.reduce((prev, file) => prev.then(() => apply(file)), Promise.resolve());
    });
}

function apply(file) {
  console.log(`Applying ${file}`);
  const sql = fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8');
  return db.transaction(query => query(sql)
    .then(() => query('INSERT INTO "schemaMigrations" ("name") VALUES ($1)', [file])));
}

function resetSchema() {
  if (process.env.NODE_ENV === 'production') {
    return Promise.reject(new Error('--reset refuses to run with NODE_ENV=production'));
  }
  console.log('Dropping and recreating the public schema');
  // Extensions live in public too, so they go with it and the baseline file
  // recreates them.
  return db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
}
