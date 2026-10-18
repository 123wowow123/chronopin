import { describe, expect, it } from 'vitest';
import { buildCatalog, keyQuery, MAX_LIMIT, parseQuery, selectList } from './adminDb';

const col = (table_name: string, column_name: string, udt_name = 'int4', extra: Record<string, unknown> = {}) => ({
  table_name,
  column_name,
  data_type: udt_name === 'int4' ? 'integer' : udt_name,
  udt_name,
  is_nullable: 'YES',
  column_default: null,
  is_generated: 'NEVER',
  is_identity: 'NO',
  identity_generation: null,
  ...extra,
});

const tables = buildCatalog(
  [
    col('Pin', 'id'),
    col('Pin', 'title', 'varchar'),
    col('Pin', 'location', 'geography'),
    col('Pin', 'categories', 'jsonb'),
    col('PinTag', 'pinId'),
    col('PinTag', 'tagId'),
    col('User', 'id'),
    col('User', 'email', 'citext'),
    col('User', 'password', 'varchar'),
    col('User', 'salt', 'varchar'),
    col('Session', 'sid', 'varchar'),
    col('schemaMigrations', 'name', 'varchar'),
  ],
  [
    { table_name: 'Pin', column_name: 'id' },
    { table_name: 'PinTag', column_name: 'pinId' },
    { table_name: 'PinTag', column_name: 'tagId' },
    { table_name: 'User', column_name: 'id' },
  ],
);
const pin = tables.get('Pin')!;

describe('buildCatalog', () => {
  it('leaves out sessions and hides password columns', () => {
    expect(tables.has('Session')).toBe(false);
    expect(tables.get('User')!.columns.map((c) => c.name)).toEqual(['id', 'email']);
  });

  it('marks read-only tables and notes what pins must use instead', () => {
    expect(tables.get('schemaMigrations')!.access).toBe('read');
    expect(pin.access).toBe('write');
    expect(pin.notes.join(' ')).toContain('userName');
    expect(pin.notes.join(' ')).toContain('DELETE /api/pins/:id');
    expect(tables.get('User')!.notes.join(' ')).toContain('POST /api/admin/users');
  });

  it('keeps a composite key in order', () => {
    expect(tables.get('PinTag')!.primaryKey).toEqual(['pinId', 'tagId']);
  });
});

describe('selectList', () => {
  it('reads a place as EWKT', () => {
    expect(selectList(pin)).toBe('"id", "title", ST_AsEWKT("location") AS "location", "categories"');
  });
});

describe('parseQuery', () => {
  it('turns filters into parameters, never into SQL text', () => {
    const q = parseQuery(pin, new URLSearchParams('title.ilike=%moon%&id.in=1,2,3&id.gte=2&location.null=false'));
    expect(q.where).toBe('WHERE "title"::text ILIKE $1 AND "id" = ANY($2) AND "id" >= $3 AND "location" IS NOT NULL');
    expect(q.values).toEqual(['%moon%', ['1', '2', '3'], '2']);
    expect(q.filtered).toBe(true);
  });

  it('refuses a column the table does not have', () => {
    expect(() => parseQuery(pin, new URLSearchParams('"id";drop=1'))).toThrow();
    expect(() => parseQuery(pin, new URLSearchParams('order=title;drop'))).toThrow();
  });

  it('only null-tests JSON and place columns', () => {
    expect(() => parseQuery(pin, new URLSearchParams('categories=x'))).toThrow();
  });

  it('orders by the key by default, newest first on a minus, and caps the page', () => {
    expect(parseQuery(pin, new URLSearchParams()).order).toBe('ORDER BY "id"');
    const q = parseQuery(pin, new URLSearchParams(`order=-id,title&limit=99999&offset=-4`));
    expect(q.order).toBe('ORDER BY "id" DESC, "title"');
    expect(q.limit).toBe(MAX_LIMIT);
    expect(q.offset).toBe(0);
    expect(q.filtered).toBe(false);
  });
});

describe('keyQuery', () => {
  it('splits a composite key in column order', () => {
    expect(keyQuery(tables.get('PinTag')!, '12,34')).toEqual({ where: 'WHERE "pinId" = $1 AND "tagId" = $2', values: ['12', '34'] });
  });

  it('refuses a key with the wrong number of parts', () => {
    expect(() => keyQuery(tables.get('PinTag')!, '12')).toThrow();
  });
});
