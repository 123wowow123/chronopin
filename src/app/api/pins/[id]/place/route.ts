import type { NextRequest } from 'next/server';
import { intParam, json, noContent, route } from '@/server/http';
import Pin from '@/server/model/pin';
import PinPlace from '@/server/model/pinPlace';
import * as places from '@/server/places';
import log from '@/server/util/log';

// A pin's place as it is right now: its Google and Yelp scores with a few
// review excerpts, whether it is open, how busy it is, and where to book.
// 204 when the pin has no place resolved, which is every pin that is not
// about somewhere you can walk into.
//
// Nothing here is stored (see src/server/places.ts): the Cache-Control below
// is the only place the answer lives once it leaves, and it is short because
// both sources limit how long their ratings may be held.
export const GET = route(async (_request: NextRequest, ctx: RouteContext<'/api/pins/[id]/place'>) => {
  const id = intParam((await ctx.params).id);
  const { pin } = await Pin.queryById(id);
  if (!pin) {
    return new Response(null, { status: 404 });
  }

  const handles = await PinPlace.byPinId(id);
  if (!places.hasAnySource(handles)) {
    return noContent();
  }

  try {
    const result = await places.forPin(handles);
    if (!result) {
      return noContent();
    }
    return json(result, 200, { 'Cache-Control': 'private, max-age=300' });
  } catch (err) {
    log.error('showPlace', (err as Error)?.message);
    return new Response(null, { status: 502 });
  }
});
