import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { emitPinEvent } from '@/server/events';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Pin from '@/server/model/pin';
import { suggestedSeriesParent } from '@/server/scrape/modelSeries';
import { setParent, suggestedParent } from '@/server/scrape/prequel';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/thread-suggestion'>;

// Only the pin's author and admins see or take a suggestion.
async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
  return user;
}

// The pin an anime or AI model pin placed by hand would answer in its show's
// or model line's thread (the earlier season or version): { parent: { id, title }, current: { id, title } | null }, or
// {} when it is already there (server/scrape/prequel.ts).
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const found = (await suggestedParent(pinId)) ?? (await suggestedSeriesParent(pinId));
  if (!found) return json({});
  const [current] = found.pin.parentId
    ? await db.query<{ id: number; title: string }>(`SELECT "id", "title" FROM "Pin" WHERE "id" = $1`, [found.pin.parentId])
    : [];
  return json({ parent: { id: found.parent.id, title: found.parent.title }, current: current ?? null });
});

// Takes the suggestion: body { parentId }, which must still be the one
// suggested, so a stale page cannot move the pin somewhere else.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const user = await authorOrAdmin(request, pinId);
  const { parentId } = await readJson(request);
  const found = (await suggestedParent(pinId)) ?? (await suggestedSeriesParent(pinId));
  if (!found || found.parent.id !== Number(parentId)) throw new HttpError(409, 'That suggestion has changed; reload the page.');
  await setParent(pinId, found.parent.id);
  for (const id of [pinId, found.pin.parentId, found.parent.id]) if (id) invalidatePin(id);
  const { pin } = await Pin.queryById(pinId);
  if (pin) emitPinEvent('update', pin, { userId: user.id });
  return json({ parentId: found.parent.id });
});
