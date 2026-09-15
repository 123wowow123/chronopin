import type { NextRequest } from 'next/server';
import { intParam, json, route } from '@/server/http';
import Pins from '@/server/model/pins';

// The thread a pin belongs to: its ancestors and the same author's follow-ups.
export const GET = route(async (_request: NextRequest, ctx: RouteContext<'/api/pins/thread/[id]'>) => {
  return json(await Pins.getThreadPins(intParam((await ctx.params).id)));
});
