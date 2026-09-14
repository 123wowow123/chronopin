import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { emitPinEvent } from '@/server/events';
import { HttpError, intParam, json, route } from '@/server/http';
import Favorite from '@/server/model/favorite';
import Pin from '@/server/model/pin';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/favorite'>;

// Nothing is written for a pin that does not exist (or was deleted).
async function existingPin(ctx: Ctx) {
  const pinId = intParam((await ctx.params).id);
  const { pin } = await Pin.queryById(pinId);
  if (!pin) {
    throw new HttpError(404, 'Not Found');
  }
  return pinId;
}

// Watch a pin. Answers with the pin as the user now sees it.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = await existingPin(ctx);

  await new Favorite({}, user, new Pin({ id: pinId })).save();
  const { pin } = await Pin.queryById(pinId, user.id);
  emitPinEvent('favorite', pin!, { userId: user.id });
  invalidatePin(pinId);
  return json(pin, 201);
});

// Stop watching (marks the row removed).
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = await existingPin(ctx);

  await new Favorite({}, user, new Pin({ id: pinId })).deleteByPinId();
  const { pin } = await Pin.queryById(pinId, user.id);
  emitPinEvent('unfavorite', pin!, { userId: user.id });
  invalidatePin(pinId);
  return json(pin, 201);
});
