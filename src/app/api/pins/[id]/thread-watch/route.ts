import { after, type NextRequest } from 'next/server';
import { getUser, requireUser } from '@/server/auth';
import { emitPinEvent } from '@/server/events';
import { HttpError, intParam, json, route } from '@/server/http';
import Pin from '@/server/model/pin';
import ThreadWatch from '@/server/model/threadWatch';
import UserWiki from '@/server/model/userWiki';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/thread-watch'>;

// Watching the thread a pin is in: the eye beside its Thread heading. Every
// answer is { watching, pinIds }, pinIds being the thread's pins, so the
// page's own watch buttons can agree without asking again.

export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const user = await getUser(request);
  return json({ watching: user ? await ThreadWatch.watching(user.id, pinId) : false });
});

export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = intParam((await ctx.params).id);
  const pinIds = await ThreadWatch.watch(user.id, pinId);
  if (!pinIds.length) throw new HttpError(404, 'Not Found');
  await announce(pinIds, 'favorite', user.id);
  return json({ watching: true, pinIds }, 201);
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = intParam((await ctx.params).id);
  const pinIds = await ThreadWatch.unwatch(user.id, pinId);
  if (!pinIds.length) throw new HttpError(404, 'Not Found');
  await announce(pinIds, 'unfavorite', user.id);
  return json({ watching: false, pinIds });
});

// Each pin's new watcher count, live and on its cached pages, as a watch
// from its own button would.
async function announce(pinIds: number[], event: 'favorite' | 'unfavorite', userId: number) {
  for (const id of pinIds) {
    const { pin } = await Pin.queryById(id, userId);
    if (pin) emitPinEvent(event, pin, { userId });
    invalidatePin(id);
  }
  after(() => UserWiki.rebuildQuietly(userId));
}
