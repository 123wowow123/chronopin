import type { NextRequest } from 'next/server';
import { HttpError, noContent, readJson, route } from '@/server/http';
import { setLiveOdds } from '@/server/liveFeed';

// Which pins' odds a live connection follows: the whole set, replacing the
// last. The connection id is the unguessable one its stream said hello with,
// and odds are public, so it needs no sign-in. 404 once that stream is gone.
// PUT /api/live/:id/odds { pins: number[] }
export const PUT = route(async (request: NextRequest, ctx: RouteContext<'/api/live/[id]/odds'>) => {
  const { pins } = await readJson<{ pins?: unknown }>(request);
  if (!Array.isArray(pins)) {
    throw new HttpError(400, 'pins must be an array of pin ids');
  }
  if (!(await setLiveOdds((await ctx.params).id, pins))) {
    return new Response(null, { status: 404 });
  }
  return noContent();
});
