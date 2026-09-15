import type { NextRequest } from 'next/server';
import { intParam, json, noContent, route } from '@/server/http';
import Pin from '@/server/model/pin';
import log from '@/server/util/log';
import * as weather from '@/server/weather';

// Weather at a pin's location on its start date: a forecast, what was
// recorded, or what is typical, depending on how far off the date is. 204
// when the pin has no location or date.
export const GET = route(async (_request: NextRequest, ctx: RouteContext<'/api/pins/[id]/weather'>) => {
  const { pin } = await Pin.queryById(intParam((await ctx.params).id));
  if (!pin) {
    return new Response(null, { status: 404 });
  }
  try {
    const result = await weather.forPin(pin);
    if (!result) {
      return noContent();
    }
    // Matches how long src/server/weather.ts keeps a forecast.
    return json(result, 200, { 'Cache-Control': `public, max-age=${result.kind === 'forecast' ? 900 : 3600}` });
  } catch (err) {
    log.error('showWeather', (err as Error)?.message);
    return new Response(null, { status: 502 });
  }
});
