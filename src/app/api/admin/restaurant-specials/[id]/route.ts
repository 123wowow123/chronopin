import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import { getSpecialVenue, updateSpecialVenue } from '@/server/model/restaurantSpecialVenue';
import { parseSpecialVenue, specialVenueRevision } from '@/server/restaurantSpecialValidation';

type Ctx = { params: Promise<{ id: string }> };
const headers = { 'Cache-Control': 'private, no-store' };
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  return json(await getSpecialVenue(intParam((await ctx.params).id)), 200, headers);
});
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireRole('admin', request);
  const body = await readJson(request);
  const revision = specialVenueRevision(body?.revision);
  return json(await updateSpecialVenue(intParam((await ctx.params).id), revision, parseSpecialVenue(body), admin.id), 200, headers);
});
export const PATCH = route(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireRole('admin', request);
  const body = await readJson(request);
  const revision = specialVenueRevision(body?.revision);
  if (typeof body.enabled !== 'boolean' || Object.keys(body).some((k) => !['enabled', 'revision'].includes(k))) throw new HttpError(400, 'PATCH accepts enabled and revision only; use PUT for profile edits');
  return json(await updateSpecialVenue(intParam((await ctx.params).id), revision, { enabled: body.enabled }, admin.id), 200, headers);
});
// Archive rather than remove: the source stays reserved and can be restored.
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireRole('admin', request);
  const body = await readJson(request);
  return json(await updateSpecialVenue(intParam((await ctx.params).id), specialVenueRevision(body?.revision), { enabled: false }, admin.id), 200, headers);
});
