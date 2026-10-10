// Every table, row for row, to JSON - and back. Where `npm run backup:data`
// saves the curated seeds production is rebuilt from, this is the whole
// database as it stands: marketplace listings and ratings, chats and their
// members, notifications, follows, job runs, settings, clicks, audit, all of
// it. Each table is one gzipped JSON Lines file (a row per line) beside a
// manifest; the folder holds password hashes and private messages, so it is
// gitignored.
//
//   npm run backup:tables                          -> scripts/backup/tables/
//   npm run backup:tables -- --dir <folder>        somewhere else
//   npm run backup:tables -- --only Listing,Message
//   npm run backup:tables -- --restore [--dir <folder>]
//       into this (migrated) database, never production: rows already there
//       are kept, keys' sequences move past the restored ids, and the pin
//       cache is rebuilt. Needs a superuser, as it holds foreign-key checks
//       until every table is in.
//
// Against prod's data: `npm run db:pull-prod` first, or point DATABASE_URL
// at prod for a read-only --save.

import '../env';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { parseArgs } from 'node:util';
import { createGunzip, createGzip } from 'node:zlib';
import * as db from '@/server/db';

const { values: flags } = parseArgs({
  options: {
    dir: { type: 'string', default: './scripts/backup/tables' },
    only: { type: 'string' },
    restore: { type: 'boolean', default: false },
  },
});

// PostGIS's reference data comes with the extension, and the pin cache is
// rebuilt from the tables it copies.
const SKIP = new Set(['spatial_ref_sys', 'PinBaseCache', 'PinTagCache', 'PinConfidence']);
// Written by the migration that made the database being restored into.
const SKIP_RESTORE = new Set(['schemaMigrations']);
const BATCH = 5000;
const INSERT_BATCH = 1000;

type Column = { name: string; udt: string; generated: boolean; serial: boolean };
type Table = { name: string; columns: Column[]; primaryKey: string[] };
type Manifest = { takenAt: string; tables: Record<string, { rows: number; file: string; columns: string[]; primaryKey: string[] }> };

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;
const GEO = new Set(['geography', 'geometry']);
const TIMES = new Set(['timestamptz', 'timestamp', 'date']);

// A column as it is saved: a place and a time in Postgres's own text - a
// place as hex EWKB (EWKT rounds the last bit of a coordinate), a time as
// "0221-01-01 00:00:00+00 BC", since a BC date as JavaScript writes it
// ("-000220-01-01T00:00:00.000Z") does not read back in.
function asText(c: Column) {
  return GEO.has(c.udt) || TIMES.has(c.udt) ? `${quote(c.name)}::text` : quote(c.name);
}

async function tables(): Promise<Table[]> {
  const cols = await db.query<{ t: string; c: string; udt: string; gen: string; ident: string | null; def: string | null }>(`
    SELECT c."table_name" AS t, c."column_name" AS c, c."udt_name" AS udt, c."is_generated" AS gen,
      c."identity_generation" AS ident, c."column_default" AS def
    FROM information_schema.columns c
      JOIN information_schema.tables t ON t."table_schema" = c."table_schema" AND t."table_name" = c."table_name"
    WHERE c."table_schema" = 'public' AND t."table_type" = 'BASE TABLE'
    ORDER BY c."table_name", c."ordinal_position"`);
  const keys = await db.query<{ t: string; c: string }>(`
    SELECT tc."table_name" AS t, kcu."column_name" AS c
    FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu."constraint_name" = tc."constraint_name" AND kcu."table_schema" = tc."table_schema" AND kcu."table_name" = tc."table_name"
    WHERE tc."table_schema" = 'public' AND tc."constraint_type" = 'PRIMARY KEY'
    ORDER BY tc."table_name", kcu."ordinal_position"`);
  const byName = new Map<string, Table>();
  for (const r of cols) {
    if (SKIP.has(r.t)) continue;
    const table = byName.get(r.t) ?? { name: r.t, columns: [], primaryKey: [] };
    byName.set(r.t, table);
    table.columns.push({
      name: r.c,
      udt: r.udt,
      generated: r.gen === 'ALWAYS',
      serial: r.ident != null || /^nextval\(/.test(r.def ?? ''),
    });
  }
  for (const k of keys) byName.get(k.t)?.primaryKey.push(k.c);
  const only = flags.only ? new Set(flags.only.split(',').map((s) => s.trim())) : null;
  return [...byName.values()].filter((t) => !only || only.has(t.name));
}

const fileOf = (table: Table) => `${table.name}.jsonl.gz`;

async function save() {
  const dir = path.resolve(flags.dir!);
  mkdirSync(dir, { recursive: true });
  const manifestPath = path.join(dir, 'manifest.json');
  // --only adds to an earlier full backup's manifest rather than dropping it.
  const manifest: Manifest =
    flags.only && existsSync(manifestPath)
      ? { ...JSON.parse(readFileSync(manifestPath, 'utf8')), takenAt: new Date().toISOString() }
      : { takenAt: new Date().toISOString(), tables: {} };
  for (const table of await tables()) {
    const select = table.columns.map((c) => `${asText(c)} AS ${quote(c.name)}`).join(', ');
    const order = table.primaryKey.length ? `ORDER BY ${table.primaryKey.map(quote).join(', ')}` : '';
    let rows = 0;
    async function* lines() {
      for (let offset = 0; ; offset += BATCH) {
        const batch = await db.query(`SELECT ${select} FROM ${quote(table.name)} ${order} LIMIT ${BATCH} OFFSET ${offset}`);
        // Escaped line and paragraph separators, which the reader would take for line ends.
        for (const row of batch) yield `${JSON.stringify(row).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')}\n`;
        rows += batch.length;
        if (batch.length < BATCH) return;
      }
    }
    await pipeline(Readable.from(lines()), createGzip(), createWriteStream(path.join(dir, fileOf(table))));
    manifest.tables[table.name] = { rows, file: fileOf(table), columns: table.columns.map((c) => c.name), primaryKey: table.primaryKey };
    console.log(`${table.name}: ${rows}`);
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const total = Object.values(manifest.tables).reduce((n, t) => n + t.rows, 0);
  console.log(`${Object.keys(manifest.tables).length} tables, ${total} rows -> ${dir}`);
}

async function* readRows(file: string): AsyncGenerator<Record<string, unknown>> {
  const lines = createInterface({ input: createReadStream(file).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of lines) if (line.trim()) yield JSON.parse(line);
}

async function restore() {
  if (process.env.NODE_ENV === 'production') throw new Error('--restore refuses to run with NODE_ENV=production');
  const dir = path.resolve(flags.dir!);
  const manifest: Manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const here = new Map((await tables()).map((t) => [t.name, t]));
  const restored: Table[] = [];
  await db.transaction(async (query) => {
    // Foreign keys and triggers wait until every table is in, so the order of
    // the files does not matter (a pin's parent can come after it).
    await query('SET LOCAL session_replication_role = replica');
    for (const [name, saved] of Object.entries(manifest.tables)) {
      const table = here.get(name);
      if (SKIP_RESTORE.has(name) || !table) {
        if (!table) console.log(`${name}: not in this database, skipped`);
        continue;
      }
      // Only the columns both sides have and that take a value.
      const cols = table.columns.filter((c) => !c.generated && saved.columns.includes(c.name));
      const list = cols.map((c) => quote(c.name)).join(', ');
      const sql = `INSERT INTO ${quote(name)} (${list}) SELECT ${list} FROM jsonb_populate_recordset(NULL::${quote(name)}, $1::jsonb) ON CONFLICT DO NOTHING`;
      let batch: Record<string, unknown>[] = [];
      let added = 0;
      const flush = async () => {
        if (!batch.length) return;
        const res = await query(`WITH ins AS (${sql} RETURNING 1) SELECT count(*)::int AS n FROM ins`, [JSON.stringify(batch)]);
        added += res[0].n;
        batch = [];
      };
      for await (const row of readRows(path.join(dir, saved.file))) {
        batch.push(row);
        if (batch.length >= INSERT_BATCH) await flush();
      }
      await flush();
      restored.push(table);
      console.log(`${name}: ${added} of ${saved.rows} added`);
    }
    // New rows get ids after the restored ones.
    for (const table of restored) {
      for (const c of table.columns.filter((col) => col.serial)) {
        await query(
          `SELECT setval(pg_get_serial_sequence($1, $2), GREATEST((SELECT max(${quote(c.name)}) FROM ${quote(table.name)}), 1))`,
          [quote(table.name), c.name],
        );
      }
    }
  });
  console.log('Rebuilding PinTagCache, PinBaseCache and PinConfidence');
  await db.query('SELECT "pinConfidenceRebuild"()');
  await db.query('SELECT "pinTagCacheRebuild"()');
  await db.query('SELECT "pinBaseCacheRebuild"()');
}

(flags.restore ? restore : save)()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
