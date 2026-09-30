import type { NextRequest } from 'next/server';
import { getTable, insert, list, parseQuery, remove, update } from '@/server/adminDb';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { afterAdminWrite } from '@/server/services/adminDbEffects';
import { createPinsAs } from '@/server/services/adminPins';

type Ctx = RouteContext<'/api/admin/db/[table]'>;

// A table's rows (docs/okf/api/admin-db.md).
//
//   GET     ?col=v&col.gt=v&col.in=a,b&order=-col&limit=50&offset=0
//           { rows, total, limit, offset }
//   POST    a row or an array of rows; ?upsert=1 replaces the sent columns of
//           a row whose key exists. 201 { rows }. For Pin, each is a POST
//           /api/pins body posted as its userId or userName (default: the
//           admin): 201, or 207 when some failed, { results: [{ index, id,
//           userId } | { index, error }] }
//   PATCH   the filters pick the rows (at least one filter), the body is the
//           columns to set. { rows }
//   DELETE  the filters pick the rows (at least one filter). { rows }

export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const table = await getTable((await ctx.params).table);
  return json(await list(table, request.nextUrl.searchParams));
});

export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireRole('admin', request);
  const table = await getTable((await ctx.params).table);
  const body = await readJson(request);
  // A pin is saved as POST /api/pins saves one, under its userId or userName.
  if (table.name === 'Pin') {
    const results = await createPinsAs(admin, Array.isArray(body) ? body : [body]);
    return json({ results }, results.every((r) => 'id' in r) ? 201 : 207);
  }
  const upsert = ['1', 'true'].includes(request.nextUrl.searchParams.get('upsert') ?? '');
  const rows = await insert(admin.id, table, body, { upsert });
  await afterAdminWrite(table, rows, admin.id);
  return json({ rows }, 201);
});

// Filters are required, so a bare PATCH or DELETE cannot reach a whole table.
function filtered(request: NextRequest, table: Awaited<ReturnType<typeof getTable>>) {
  const q = parseQuery(table, request.nextUrl.searchParams);
  if (!q.filtered) throw new HttpError(400, '', { message: 'Pick the rows with at least one filter, or use /api/admin/db/:table/:key' });
  return q;
}

export const PATCH = route(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireRole('admin', request);
  const table = await getTable((await ctx.params).table);
  const rows = await update(admin.id, table, filtered(request, table), await readJson(request));
  await afterAdminWrite(table, rows, admin.id);
  return json({ rows });
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireRole('admin', request);
  const table = await getTable((await ctx.params).table);
  const rows = await remove(admin.id, table, filtered(request, table));
  await afterAdminWrite(table, rows, admin.id);
  return json({ rows });
});
