import type { NextRequest } from 'next/server';
import { json, noContent, route } from '@/server/http';
import log from '@/server/util/log';
import { timeZoneOrUtc } from '@/server/viewer';
import * as weather from '@/server/weather';

const CACHE = { 'Cache-Control': 'private, max-age=900' };

// Weather now and today for the viewer's own place (the bell menu), either
// at ?lat=&lon= or, with neither, in the city of their ?tz= time zone (or the
// tz cookie). The zone is what every viewer gets without being asked for a
// location; coordinates are rounded to two decimals, about a kilometre, so
// nearby viewers share a lookup and no exact position is kept.
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  try {
    if (!params.get('lat') && !params.get('lon')) {
      const timeZone = timeZoneOrUtc(params.get('tz') ?? request.cookies.get('tz')?.value);
      const place = await weather.placeForTimeZone(timeZone);
      if (!place) {
        return noContent();
      }
      const zoned = await weather.forPlace(place);
      return zoned ? json({ ...zoned, place: place.name }, 200, CACHE) : noContent();
    }

    const latitude = Math.round(Number(params.get('lat')) * 100) / 100;
    const longitude = Math.round(Number(params.get('lon')) * 100) / 100;
    if (!params.get('lat') || !params.get('lon') || !(Math.abs(latitude) <= 90) || !(Math.abs(longitude) <= 180)) {
      return new Response(null, { status: 400 });
    }
    const result = await weather.forPlace({ latitude, longitude });
    return result ? json(result, 200, CACHE) : noContent();
  } catch (err) {
    log.error('localWeather', (err as Error)?.message);
    return new Response(null, { status: 502 });
  }
});
