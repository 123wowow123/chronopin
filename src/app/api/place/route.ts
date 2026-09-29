import type { NextRequest } from 'next/server';
import { json, noContent, route } from '@/server/http';
import log from '@/server/util/log';
import { timeZoneOrUtc } from '@/server/viewer';
import * as weather from '@/server/weather';

// A day: a time zone's city moves only when the tz database does.
const CACHE = { 'Cache-Control': 'private, max-age=86400' };

// Where the viewer is, near enough to measure a distance from: the city their
// ?tz= time zone (or the tz cookie) names, geocoded once and kept. It is what
// every viewer gives away without being asked for a location; a viewer who
// has already granted one sends their own coordinates and never comes here.
export const GET = route(async (request: NextRequest) => {
  const timeZone = timeZoneOrUtc(request.nextUrl.searchParams.get('tz') ?? request.cookies.get('tz')?.value);
  try {
    const place = await weather.placeForTimeZone(timeZone);
    return place ? json(place, 200, CACHE) : noContent();
  } catch (err) {
    log.error('viewerPlace', (err as Error)?.message);
    return new Response(null, { status: 502 });
  }
});
