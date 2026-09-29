import type { NextRequest } from 'next/server';
import { HttpError, noContent, readJson, route } from '@/server/http';
import { setLiveStocks } from '@/server/liveFeed';

// Which pins' stock quotes a live connection follows: the whole set,
// replacing the last, like the odds (../odds/route.ts). 404 once gone.
// PUT /api/live/:id/stocks { pins: number[] }
export const PUT = route(async (request: NextRequest, ctx: RouteContext<'/api/live/[id]/stocks'>) => {
  const { pins } = await readJson<{ pins?: unknown }>(request);
  if (!Array.isArray(pins)) {
    throw new HttpError(400, 'pins must be an array of pin ids');
  }
  if (!(await setLiveStocks((await ctx.params).id, pins))) {
    return new Response(null, { status: 404 });
  }
  return noContent();
});
