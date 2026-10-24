import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { factoryForPin, factoryProblem, deleteFactory, saveFactory } from '@/server/model/pinFactory';
import { invalidatePin } from '@/server/services/cache';

type Ctx = { params: Promise<{ id: string }> };
async function visiblePin(id: number) {
  const [pin] = await db.query<{ userId: number | null }>('SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL', [id]);
  if (!pin) throw new HttpError(404, 'Not Found');
  return pin;
}
async function authorOrAdmin(request: NextRequest, id: number) {
  const user = await requireUser(request);
  const pin = await visiblePin(id);
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const id = intParam((await ctx.params).id);
  await visiblePin(id);
  const profile = await factoryForPin(id);
  return profile ? json(profile) : noContent();
});
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const id = intParam((await ctx.params).id);
  await authorOrAdmin(request, id);
  const checked = factoryProblem(await readJson(request));
  if (typeof checked === 'string') throw new HttpError(400, checked);
  if (!(await saveFactory(id, checked))) throw new HttpError(409, 'This factory profile was set by hand; send source "hand" to replace it.');
  invalidatePin(id);
  return json(await factoryForPin(id));
});
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const id = intParam((await ctx.params).id);
  await authorOrAdmin(request, id);
  await deleteFactory(id);
  invalidatePin(id);
  return noContent();
});
