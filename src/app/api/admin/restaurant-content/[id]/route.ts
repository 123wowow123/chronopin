import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import { getRestaurantContent, updateRestaurantContent } from '@/server/model/restaurantContent';
import { parseRestaurantContent } from '@/server/restaurantContentValidation';
import { specialVenueRevision } from '@/server/restaurantSpecialValidation';
import { invalidateRestaurantContent, verifyRestaurantTilePhoto } from '@/server/services/restaurantContent';
type Ctx = { params: Promise<{ id: string }> };
const headers = { 'Cache-Control': 'private, no-store' };
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  return json(await getRestaurantContent(intParam((await ctx.params).id)), 200, headers);
});
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireRole('admin', request);
  const body = await readJson(request), revision = specialVenueRevision(body?.revision);
  const input = parseRestaurantContent(body);
  await verifyRestaurantTilePhoto(input.profile);
  const saved = await updateRestaurantContent(intParam((await ctx.params).id), revision, input, admin.id);
  await invalidateRestaurantContent(saved.profile.pinSourceUrl);
  return json(saved, 200, headers);
});
export const PATCH = route(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireRole('admin', request);
  const body = await readJson(request), revision = specialVenueRevision(body?.revision);
  if (typeof body.enabled !== 'boolean' || Object.keys(body).some((k) => !['enabled', 'revision'].includes(k))) throw new HttpError(400, 'PATCH accepts enabled and revision only; use PUT to edit content');
  const saved = await updateRestaurantContent(intParam((await ctx.params).id), revision, { enabled: body.enabled }, admin.id);
  await invalidateRestaurantContent(saved.profile.pinSourceUrl);
  return json(saved, 200, headers);
});
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireRole('admin', request);
  const body = await readJson(request);
  const saved = await updateRestaurantContent(intParam((await ctx.params).id), specialVenueRevision(body?.revision), { enabled: false }, admin.id);
  await invalidateRestaurantContent(saved.profile.pinSourceUrl);
  return json(saved, 200, headers);
});
