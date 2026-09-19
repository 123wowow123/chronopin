import type { NextRequest } from 'next/server';
import { json, noContent, route } from '@/server/http';
import log from '@/server/util/log';
import * as weather from '@/server/weather';

// Weather now and today at ?lat=&lon=, for the viewer's own place (the bell
// menu). Coordinates are rounded to two decimals, about a kilometre, so
// nearby viewers share a lookup and no exact position is kept.
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const latitude = Math.round(Number(params.get('lat')) * 100) / 100;
  const longitude = Math.round(Number(params.get('lon')) * 100) / 100;
  if (!params.get('lat') || !params.get('lon') || !(Math.abs(latitude) <= 90) || !(Math.abs(longitude) <= 180)) {
    return new Response(null, { status: 400 });
  }
  try {
    const result = await weather.forPlace({ latitude, longitude });
    if (!result) {
      return noContent();
    }
    return json(result, 200, { 'Cache-Control': 'private, max-age=900' });
  } catch (err) {
    log.error('localWeather', (err as Error)?.message);
    return new Response(null, { status: 502 });
  }
});
