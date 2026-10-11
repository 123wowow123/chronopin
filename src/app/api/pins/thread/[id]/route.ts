import type { NextRequest } from 'next/server';
import { intParam, json, route } from '@/server/http';
import Pins from '@/server/model/pins';

// The thread a pin belongs to, as a tree in reading order: the top pin, then
// each pin's responses under it (threadLevel is how far a row is nested).
export const GET = route(async (_request: NextRequest, ctx: RouteContext<'/api/pins/thread/[id]'>) => {
  return json(await Pins.getThreadPins(intParam((await ctx.params).id)));
});
