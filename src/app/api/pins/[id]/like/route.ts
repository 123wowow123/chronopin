import { after, type NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { emitPinEvent } from '@/server/events';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Like from '@/server/model/like';
import Pin from '@/server/model/pin';
import UserWiki from '@/server/model/userWiki';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/like'>;

// Nothing is written for a pin that does not exist (or was deleted).
async function existingPin(ctx: Ctx) {
  const pinId = intParam((await ctx.params).id);
  const { pin } = await Pin.queryById(pinId);
  if (!pin) {
    throw new HttpError(404, 'Not Found');
  }
  return pinId;
}

// Both answer with the pin as the user now sees it (likeCount, hasLike).
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = await existingPin(ctx);
  const body = await readJson(request);
  const likeBody = typeof body.like === 'boolean' ? body : { like: true };

  await new Like(likeBody, user, new Pin({ id: pinId })).save();
  const { pin } = await Pin.queryById(pinId, user.id);
  emitPinEvent('like', pin!, { userId: user.id });
  invalidatePin(pinId);
  after(() => UserWiki.rebuildQuietly(user.id));
  return json(pin, 201);
});

// Marks the like removed.
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = await existingPin(ctx);

  await new Like({}, user, new Pin({ id: pinId })).deleteByPinId();
  const { pin } = await Pin.queryById(pinId, user.id);
  emitPinEvent('unlike', pin!, { userId: user.id });
  invalidatePin(pinId);
  after(() => UserWiki.rebuildQuietly(user.id));
  return json(pin, 201);
});
