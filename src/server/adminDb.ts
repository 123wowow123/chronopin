// The admin table API (src/app/api/admin/db, docs/okf/api/admin-db.md): any
// table's rows read, created, changed and deleted by an admin, so the site
// can be managed - and a job's results replayed on prod - without SQL.
//
// Table and column names come only from the database's own catalog; a name
// the catalog does not know is a 400, and every value is a query parameter.
// Every write is recorded in AdminAudit (0099) in the same transaction.
// What follows a write (pages expiring, the live feed, search) is
// services/adminDbEffects.ts.

import * as db from './db';
import { HttpError } from './util/httpError';

export type Column = {
  name: string;
  type: string;
  udt: string;
  nullable: boolean;
  hasDefault: boolean;
  generated: boolean;
};

export type Access = 'write' | 'read';

export type Table = {
  name: string;
  access: Access;
  columns: Column[];
  primaryKey: string[];
  // Why a table, or an operation on it, is refused here, and where to go instead.
  notes: string[];
};

export type Row = Record<string, unknown>;

// Not listed at all: login sessions, and PostGIS's own reference table.
const NO_ACCESS = new Set(['Session', 'spatial_ref_sys']);

// Listed and readable, never written here.
const READ_ONLY: Record<string, string> = {
  schemaMigrations: 'Written by npm run create:db.',
  PinBaseCache: "Kept in step with PinBaseView by 0072's triggers.",
  AdminAudit: "The record of this API's own writes.",
};

// Never sent back and never written here.
const HIDDEN: Record<string, string[]> = {
  User: ['password', 'salt'],
  PushSubscription: ['auth', 'p256dh'],
};

// Operations that have a route of their own which does more than the row: a
// new pin is threaded, deduplicated, tagged and fed live; a removed one is a
// soft delete its duplicates' pages follow.
// Pin has its own insert (services/adminPins.ts), which the table route hands
// pins to: posted for any author through the same save as POST /api/pins.
export const PIN_INSERT_NOTE = 'A POSTed pin is saved as a POST /api/pins body, as its userId or userName (default: the admin).';
const NO_INSERT: Record<string, string> = {};
const NO_DELETE: Record<string, string> = {
  Pin: 'Delete pins with DELETE /api/pins/:id (a soft delete).',
};
const HIDDEN_NOTES: Record<string, string> = {
  User: "Set a password with the user's password route, not here.",
};

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 1000;
// The most rows one PATCH, DELETE or POST may touch.
export const MAX_ROWS = 1000;

const GEO = new Set(['geography', 'geometry']);
const JSON_TYPES = new Set(['json', 'jsonb']);

// The catalog, read once a minute: a migration adds tables while the app runs.
const CATALOG_TTL_MS = 60_000;
let cached: { at: number; tables: Map<string, Table> } | null = null;

export async function catalog(): Promise<Map<string, Table>> {
  if (cached && Date.now() - cached.at < CATALOG_TTL_MS) return cached.tables;
  const columns = await db.query<{
    table_name: string;
    column_name: string;
    data_type: string;
    udt_name: string;
    is_nullable: string;
    column_default: string | null;
    is_generated: string;
    is_identity: string;
    identity_generation: string | null;
  }>(`
    SELECT c."table_name", c."column_name", c."data_type", c."udt_name", c."is_nullable", c."column_default",
      c."is_generated", c."is_identity", c."identity_generation"
    FROM information_schema.columns c
      JOIN information_schema.tables t ON t."table_schema" = c."table_schema" AND t."table_name" = c."table_name"
    WHERE c."table_schema" = 'public' AND t."table_type" = 'BASE TABLE'
    ORDER BY c."table_name", c."ordinal_position"`);
  const keys = await db.query<{ table_name: string; column_name: string }>(`
    SELECT tc."table_name", kcu."column_name"
    FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu."constraint_name" = tc."constraint_name" AND kcu."table_schema" = tc."table_schema" AND kcu."table_name" = tc."table_name"
    WHERE tc."table_schema" = 'public' AND tc."constraint_type" = 'PRIMARY KEY'
    ORDER BY tc."table_name", kcu."ordinal_position"`);
  cached = { at: Date.now(), tables: buildCatalog(columns, keys) };
  return cached.tables;
}

export function buildCatalog(
  columns: {
    table_name: string;
    column_name: string;
    data_type: string;
    udt_name: string;
    is_nullable: string;
    column_default: string | null;
    is_generated: string;
    is_identity: string;
    identity_generation: string | null;
  }[],
  keys: { table_name: string; column_name: string }[],
): Map<string, Table> {
  const tables = new Map<string, Table>();
  for (const c of columns) {
    if (NO_ACCESS.has(c.table_name)) continue;
    let table = tables.get(c.table_name);
    if (!table) {
      const notes = [READ_ONLY[c.table_name], c.table_name === 'Pin' ? PIN_INSERT_NOTE : NO_INSERT[c.table_name], NO_DELETE[c.table_name], HIDDEN_NOTES[c.table_name]].filter(
        (n): n is string => !!n,
      );
      table = { name: c.table_name, access: READ_ONLY[c.table_name] ? 'read' : 'write', columns: [], primaryKey: [], notes };
      tables.set(c.table_name, table);
    }
    if (HIDDEN[c.table_name]?.includes(c.column_name)) continue;
    table.columns.push({
      name: c.column_name,
      type: c.data_type,
      udt: c.udt_name,
      nullable: c.is_nullable === 'YES',
      hasDefault: c.column_default != null || c.is_identity === 'YES',
      // A generated column, or an identity column that refuses a value.
      generated: c.is_generated === 'ALWAYS' || c.identity_generation === 'ALWAYS',
    });
  }
  for (const k of keys) tables.get(k.table_name)?.primaryKey.push(k.column_name);
  return tables;
}

export async function getTable(name: string): Promise<Table> {
  const table = (await catalog()).get(name);
  if (!table) throw new HttpError(404, '', { message: `No table ${name}` });
  return table;
}

export const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;

function column(table: Table, name: string): Column {
  const col = table.columns.find((c) => c.name === name);
  if (!col) throw new HttpError(400, '', { message: `${table.name} has no column ${name}` });
  return col;
}

// What a SELECT or RETURNING lists: every visible column, a place as EWKT
// text (which the same column takes back on a write).
export function selectList(table: Table): string {
  return table.columns.map((c) => (GEO.has(c.udt) ? `ST_AsEWKT(${quote(c.name)}) AS ${quote(c.name)}` : quote(c.name))).join(', ');
}

// A value as a query parameter, with its placeholder: JSON columns take the
// value as JSON text, anything else as it came.
function param(col: Column, value: unknown, values: unknown[]): string {
  if (value === null || value === undefined) {
    values.push(null);
    return `$${values.length}`;
  }
  if (JSON_TYPES.has(col.udt)) {
    values.push(JSON.stringify(value));
    return `$${values.length}::${col.udt}`;
  }
  if (typeof value === 'object' && !(col.type === 'ARRAY' && Array.isArray(value))) {
    throw new HttpError(400, '', { message: `${col.name} takes a ${col.type}, not an object` });
  }
  values.push(value);
  return `$${values.length}`;
}

const OPS: Record<string, string> = { eq: '=', ne: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' };
const RESERVED = new Set(['limit', 'offset', 'order', 'upsert']);

export type Query = { where: string; values: unknown[]; order: string; limit: number; offset: number; filtered: boolean };

// A collection's query string as SQL. Each other parameter is a filter:
//   col=v  col.ne=v  col.gt=v  col.gte=v  col.lt=v  col.lte=v
//   col.like=%v%  col.ilike=%v%  col.in=a,b,c  col.null=true|false
// order=-utcCreatedDateTime,id (a minus sorts newest first); limit, offset.
export function parseQuery(table: Table, params: URLSearchParams): Query {
  const values: unknown[] = [];
  const clauses: string[] = [];
  for (const [key, raw] of params) {
    if (RESERVED.has(key)) continue;
    const dot = key.lastIndexOf('.');
    const known = dot > 0 && ['in', 'null', 'like', 'ilike', ...Object.keys(OPS)].includes(key.slice(dot + 1));
    const name = known ? key.slice(0, dot) : key;
    const op = known ? key.slice(dot + 1) : 'eq';
    const col = column(table, name);
    const q = quote(col.name);
    if (op === 'null') {
      clauses.push(`${q} IS ${raw === 'false' ? 'NOT ' : ''}NULL`);
      continue;
    }
    if (JSON_TYPES.has(col.udt) || GEO.has(col.udt)) {
      throw new HttpError(400, '', { message: `${col.name} can only be filtered with .null` });
    }
    if (op === 'like' || op === 'ilike') {
      values.push(raw);
      clauses.push(`${q}::text ${op === 'like' ? 'LIKE' : 'ILIKE'} $${values.length}`);
    } else if (op === 'in') {
      values.push(raw.split(',').map((v) => v.trim()));
      clauses.push(`${q} = ANY($${values.length})`);
    } else {
      values.push(raw);
      clauses.push(`${q} ${OPS[op]} $${values.length}`);
    }
  }

  const orderBy = (params.get('order') || table.primaryKey.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const desc = s.startsWith('-');
      return `${quote(column(table, desc ? s.slice(1) : s).name)}${desc ? ' DESC' : ''}`;
    });

  const limit = Math.min(Math.max(Number.parseInt(params.get('limit') ?? '', 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(Number.parseInt(params.get('offset') ?? '', 10) || 0, 0);
  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
    order: orderBy.length ? `ORDER BY ${orderBy.join(', ')}` : '',
    limit,
    offset,
    filtered: clauses.length > 0,
  };
}

// A row's key in the URL: its primary key's values, comma-separated in the
// key's column order ("12" or "12,34").
export function keyQuery(table: Table, key: string): Pick<Query, 'where' | 'values'> {
  if (!table.primaryKey.length) throw new HttpError(400, '', { message: `${table.name} has no primary key; filter the collection instead` });
  const parts = table.primaryKey.length === 1 ? [key] : key.split(',');
  if (parts.length !== table.primaryKey.length) {
    throw new HttpError(400, '', { message: `${table.name}'s key is ${table.primaryKey.join(',')}` });
  }
  return {
    where: `WHERE ${table.primaryKey.map((k, i) => `${quote(k)} = $${i + 1}`).join(' AND ')}`,
    values: parts,
  };
}

const keyOf = (table: Table, row: Row) =>
  table.primaryKey.length ? Object.fromEntries(table.primaryKey.map((k) => [k, row[k]])) : null;

function writable(table: Table, op: 'insert' | 'update' | 'delete') {
  if (table.access !== 'write') throw new HttpError(403, '', { message: READ_ONLY[table.name] ?? `${table.name} is read-only` });
  if (op === 'insert' && NO_INSERT[table.name]) throw new HttpError(403, '', { message: NO_INSERT[table.name] });
  if (op === 'delete' && NO_DELETE[table.name]) throw new HttpError(403, '', { message: NO_DELETE[table.name] });
}

// The fields of a body that may be written: known, visible, not generated.
function fields(table: Table, body: unknown): [Column, unknown][] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, '', { message: 'Expected a row object' });
  const out: [Column, unknown][] = [];
  for (const [name, value] of Object.entries(body)) {
    const col = column(table, name);
    if (col.generated) throw new HttpError(400, '', { message: `${name} is generated and cannot be written` });
    out.push([col, value]);
  }
  return out;
}

export type Audit = { action: 'insert' | 'update' | 'delete'; key: Row | null; before: Row | null; after: Row | null };

async function audit(query: db.QueryFn, userId: number, table: Table, entries: Audit[]) {
  await writeAudit(query, userId, table.name, entries);
}

async function writeAudit(query: db.QueryFn, userId: number, tableName: string, entries: Audit[]) {
  for (const e of entries) {
    await query(
      `INSERT INTO "AdminAudit" ("userId", "action", "table", "key", "before", "after") VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)`,
      [userId, e.action, tableName, json(e.key), json(e.before), json(e.after)],
    );
  }
}

// For a write an admin made through another route (a pin posted for someone
// else, services/adminPins.ts), so the audit covers it too.
export function recordAudit(userId: number, tableName: string, entries: Audit[]) {
  return writeAudit(db.query, userId, tableName, entries);
}

const json = (value: unknown) => (value == null ? null : JSON.stringify(value));

export async function list(table: Table, params: URLSearchParams) {
  const q = parseQuery(table, params);
  const rows = await db.query(
    `SELECT ${selectList(table)} FROM ${quote(table.name)} ${q.where} ${q.order} LIMIT ${q.limit} OFFSET ${q.offset}`,
    q.values,
  );
  const [{ total }] = await db.query<{ total: string }>(`SELECT count(*) AS "total" FROM ${quote(table.name)} ${q.where}`, q.values);
  return { rows, total: Number(total), limit: q.limit, offset: q.offset };
}

export async function get(table: Table, key: string): Promise<Row | undefined> {
  const q = keyQuery(table, key);
  const [row] = await db.query(`SELECT ${selectList(table)} FROM ${quote(table.name)} ${q.where}`, q.values);
  return row;
}

// New rows, one statement each, in one transaction. With upsert, a row whose
// primary key exists has the columns it sent replaced instead.
export async function insert(userId: number, table: Table, body: unknown, options: { upsert?: boolean } = {}): Promise<Row[]> {
  writable(table, 'insert');
  const bodies = Array.isArray(body) ? body : [body];
  if (!bodies.length || bodies.length > MAX_ROWS) throw new HttpError(400, '', { message: `Send 1 to ${MAX_ROWS} rows` });
  if (options.upsert && !table.primaryKey.length) throw new HttpError(400, '', { message: `${table.name} has no primary key to upsert on` });
  return db.transaction(async (query) => {
    const saved: Row[] = [];
    const entries: Audit[] = [];
    for (const b of bodies) {
      const f = fields(table, b);
      const values: unknown[] = [];
      const placeholders = f.map(([col, value]) => param(col, value, values));
      let before: Row | null = null;
      let conflict = '';
      if (options.upsert) {
        const pk = table.primaryKey;
        const given = pk.map((k) => f.find(([col]) => col.name === k));
        if (given.some((g) => !g)) throw new HttpError(400, '', { message: `An upsert row needs its key ${pk.join(',')}` });
        [before] = await query(
          `SELECT ${selectList(table)} FROM ${quote(table.name)} WHERE ${pk.map((k, i) => `${quote(k)} = $${i + 1}`).join(' AND ')} FOR UPDATE`,
          given.map((g) => g![1]),
        );
        const rest = f.filter(([col]) => !pk.includes(col.name));
        conflict = `ON CONFLICT (${pk.map(quote).join(', ')}) DO ${
          rest.length ? `UPDATE SET ${rest.map(([col]) => `${quote(col.name)} = EXCLUDED.${quote(col.name)}`).join(', ')}` : 'NOTHING'
        }`;
      }
      const sql = f.length
        ? `INSERT INTO ${quote(table.name)} (${f.map(([col]) => quote(col.name)).join(', ')}) VALUES (${placeholders.join(', ')})`
        : `INSERT INTO ${quote(table.name)} DEFAULT VALUES`;
      const [row] = await query(`${sql} ${conflict} RETURNING ${selectList(table)}`, values);
      // DO NOTHING on an existing row returns none: it is as it was.
      const after = row ?? before;
      if (after) saved.push(after);
      if (row) entries.push({ action: before ? 'update' : 'insert', key: keyOf(table, row), before, after: row });
    }
    await audit(query, userId, table, entries);
    return saved;
  });
}

// The rows a WHERE picks, locked, refusing more than MAX_ROWS.
async function pick(query: db.QueryFn, table: Table, where: string, values: unknown[]): Promise<Row[]> {
  const rows = await query(`SELECT ${selectList(table)} FROM ${quote(table.name)} ${where} LIMIT ${MAX_ROWS + 1} FOR UPDATE`, values);
  if (rows.length > MAX_ROWS) throw new HttpError(400, '', { message: `That matches more than ${MAX_ROWS} rows; narrow the filter` });
  return rows;
}

export async function update(userId: number, table: Table, where: Pick<Query, 'where' | 'values'>, patch: unknown): Promise<Row[]> {
  writable(table, 'update');
  const f = fields(table, patch);
  if (!f.length) throw new HttpError(400, '', { message: 'Nothing to change' });
  return db.transaction(async (query) => {
    const before = await pick(query, table, where.where, where.values);
    if (!before.length) return [];
    const values = [...where.values];
    const sets = f.map(([col, value]) => `${quote(col.name)} = ${param(col, value, values)}`);
    const after = await query(`UPDATE ${quote(table.name)} SET ${sets.join(', ')} ${where.where} RETURNING ${selectList(table)}`, values);
    const beforeByKey = new Map(before.map((r) => [JSON.stringify(keyOf(table, r)), r]));
    await audit(
      query,
      userId,
      table,
      after.map((row) => ({ action: 'update', key: keyOf(table, row), before: beforeByKey.get(JSON.stringify(keyOf(table, row))) ?? null, after: row })),
    );
    return after;
  });
}

export async function remove(userId: number, table: Table, where: Pick<Query, 'where' | 'values'>): Promise<Row[]> {
  writable(table, 'delete');
  return db.transaction(async (query) => {
    await pick(query, table, where.where, where.values);
    const gone = await query(`DELETE FROM ${quote(table.name)} ${where.where} RETURNING ${selectList(table)}`, where.values);
    await audit(
      query,
      userId,
      table,
      gone.map((row) => ({ action: 'delete', key: keyOf(table, row), before: row, after: null })),
    );
    return gone;
  });
}
