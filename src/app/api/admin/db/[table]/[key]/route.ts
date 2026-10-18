import type { NextRequest } from 'next/server';
import { get, getTable, keyQuery, remove, update } from '@/server/adminDb';
import { requireRole } from '@/server/auth';
import { HttpError, json, noContent, readJson, route } from '@/server/http';
import { afterAdminWrite } from '@/server/services/adminDbEffects';

type Ctx = RouteContext<'/api/admin/db/[table]/[key]'>;

// One row by its primary key (docs/okf/api/admin-db.md): "12", or for a
// two-column key "12,34" in the key's column order.
//
//   GET     the row, or 404
//   PATCH   the columns to set; the row as it is now, or 404
//   DELETE  204, or 404

async function target(request: NextRequest, ctx: Ctx) {
  const admin = await requireRole('admin', request);
  const { table: name, key } = await ctx.params;
  const table = await getTable(name);
  return { admin, table, key };
}

export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const { table, key } = await target(request, ctx);
  const row = await get(table, key);
  if (!row) throw new HttpError(404, 'Not Found');
  return json(row);
});

export const PATCH = route(async (request: NextRequest, ctx: Ctx) => {
  const { admin, table, key } = await target(request, ctx);
  const [row] = await update(admin.id, table, keyQuery(table, key), await readJson(request));
  if (!row) throw new HttpError(404, 'Not Found');
  await afterAdminWrite(table, [row], admin.id);
  return json(row);
});

export const PUT = PATCH;

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const { admin, table, key } = await target(request, ctx);
  const [row] = await remove(admin.id, table, keyQuery(table, key));
  if (!row) throw new HttpError(404, 'Not Found');
  await afterAdminWrite(table, [row], admin.id);
  return noContent();
});
