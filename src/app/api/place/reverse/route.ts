import type { NextRequest } from 'next/server';
import { isLocale } from '@/lib/i18n/config';
import { locationProblem, roundCoordinate } from '@/lib/location';
import { requireUser } from '@/server/auth';
import { nameForPoint } from '@/server/geocode';
import { HttpError, json, route } from '@/server/http';

// The town at ?lat=&lon= (a device's position, for "Use my current
// location" on a listing), rounded to about a kilometre and named in ?lang=.
// Signed in only: every call is a Nominatim request, one a second for the
// whole app. The name is null where the geocoder has none.
export const GET = route(async (request: NextRequest) => {
  await requireUser(request);
  const params = request.nextUrl.searchParams;
  const place = { latitude: Number(params.get('lat')), longitude: Number(params.get('lon')) };
  if (params.get('lat') == null || params.get('lon') == null || locationProblem(place)) {
    throw new HttpError(400, '', { message: 'lat and lon must be a latitude and a longitude' });
  }
  const latitude = roundCoordinate(place.latitude);
  const longitude = roundCoordinate(place.longitude);
  const lang = params.get('lang');
  return json({ latitude, longitude, name: await nameForPoint(latitude, longitude, lang && isLocale(lang) ? lang : 'en') });
});
