import type { NextRequest } from 'next/server';
import { isLocale } from '@/lib/i18n/config';
import { locationProblem } from '@/lib/location';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import { autocompletePlaces, logPlaceSearchError } from '@/server/placeSearch';

// Places matching ?q= as it is typed - an address, a neighbourhood, a town,
// a region or a postcode - for a listing's location, named in ?lang= and
// ranked towards ?lat=&lon= when given. Signed in only, as the listing form
// is. An empty list for under two characters, or when the search is down.
export const GET = route(async (request: NextRequest) => {
  await requireUser(request);
  const params = request.nextUrl.searchParams;
  const lang = params.get('lang');
  const near = { latitude: Number(params.get('lat')), longitude: Number(params.get('lon')) };
  const hasNear = params.get('lat') != null && params.get('lon') != null && !locationProblem(near);
  try {
    return json(await autocompletePlaces(params.get('q') ?? '', lang && isLocale(lang) ? lang : 'en', hasNear ? near : null));
  } catch (err) {
    logPlaceSearchError(err);
    return json([]);
  }
});
