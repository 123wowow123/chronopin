import type { NextRequest } from 'next/server';
import { isLocale } from '@/lib/i18n/config';
import { json, route } from '@/server/http';
import log from '@/server/util/log';
import * as weather from '@/server/weather';

// A week: a town's name and place do not move.
const CACHE = { 'Cache-Control': 'public, max-age=604800' };

// Places matching ?q=, for picking a default location on the profile, named
// in ?lang= (a site language; English otherwise). An empty list for a query
// under two characters or one the geocoder cannot match.
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const lang = params.get('lang');
  try {
    const places = await weather.searchPlaces(params.get('q') ?? '', lang && isLocale(lang) ? lang : 'en');
    return json(places, 200, CACHE);
  } catch (err) {
    log.error('placeSearch', (err as Error)?.message);
    return new Response(null, { status: 502 });
  }
});
