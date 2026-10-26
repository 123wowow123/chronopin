import type { NextRequest } from 'next/server';
import tzlookup from 'tz-lookup';
import { requireUser } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import UserBirth from '@/server/model/userBirth';
import { birthTimeProblem } from '@/lib/birthDetails';
import { locationMessage, locationProblem, roundCoordinate } from '@/lib/location';

// The signed-in user's hour and place of birth (0222). GET reads them; PUT
// replaces both ({ time: "HH:MM" | null, place: { latitude, longitude, name } | null });
// an empty pair removes them.
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  return json((await UserBirth.get(user.id)) ?? { time: null, latitude: null, longitude: null, placeName: null, timeZone: null });
});

export const PUT = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const body = await readJson(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, '', { message: 'Expected { time, place }' });
  if (birthTimeProblem(body.time)) throw new HttpError(422, '', { code: 'birth.time', message: 'time must be HH:MM (24-hour) or null.' });
  const time = typeof body.time === 'string' && body.time ? body.time : null;
  let place = { latitude: null as number | null, longitude: null as number | null, placeName: null as string | null, timeZone: null as string | null };
  if (body.place != null) {
    const problem = locationProblem(body.place);
    if (problem) throw new HttpError(422, '', { code: `birth.place`, message: locationMessage(problem).replace('location.', 'place.') });
    const latitude = roundCoordinate(body.place.latitude);
    const longitude = roundCoordinate(body.place.longitude);
    let timeZone: string | null = null;
    try {
      timeZone = tzlookup(latitude, longitude);
    } catch {
      timeZone = null;
    }
    place = { latitude, longitude, placeName: typeof body.place.name === 'string' && body.place.name.trim() ? body.place.name.trim() : null, timeZone };
  }
  const birth = { time, ...place };
  await UserBirth.set(user.id, birth);
  return json(birth);
});
