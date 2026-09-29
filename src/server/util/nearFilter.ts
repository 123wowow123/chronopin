// The timeline's "within" filter: the ring around the viewer that a pin's
// place has to fall inside.
//
// A request names the ring as a point and a radius - near=34.05,-118.24 and
// within=50km (or 30mi, the unit the reader set it in) - and both have to be
// there for a ring to exist at all. Only the browser knows where the viewer
// is, so the page's own URL carries the radius alone and the coordinates are
// added per request; a request that has one without the other is asking for
// no ring rather than for a broken one.
//
// The point rides back out on the pagination links beside created_since, so
// later pages keep measuring from the same place.

import { MAX_RADIUS_KM, parseRadius } from '@/lib/radius';
import { HttpError } from './httpError';

// A ring as the queries want it: an EWKT point Postgres reads straight as a
// geography, and the radius in metres for ST_DWithin.
export type NearFilter = {
  latitude: number;
  longitude: number;
  radiusKm: number;
  point: string;
  meters: number;
};

export type NearQuery = { near?: string | null; within?: string | null };

// Returns the ring pins must fall inside, or null when the request asked for
// none. Throws a 400 for a point or a radius it cannot make sense of, rather
// than quietly serving the whole world to someone who asked for 50 km of it.
export function resolveNear(query: NearQuery | null | undefined): NearFilter | null {
  const near = query?.near;
  const within = query?.within;
  if (!near || !within) return null;

  const [lat, lon] = near.split(',');
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!isFinite(latitude) || !isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new HttpError(400, `near must be a latitude,longitude on the map: got '${near}'`);
  }

  // The wire always spells the unit out, so there is no reader here to guess
  // one for: an imperial=false parse reads a bare number as kilometres.
  const radiusKm = parseRadius(within, false);
  if (!radiusKm) {
    throw new HttpError(400, `within must be a distance of ${MAX_RADIUS_KM} km or less, as km or mi: got '${within}'`);
  }

  return {
    latitude,
    longitude,
    radiusKm,
    point: `SRID=4326;POINT(${longitude} ${latitude})`,
    meters: radiusKm * 1000,
  };
}

// The extra query parameters a paginated response must echo so that later
// pages measure from the very same ring this request resolved. The radius
// goes back out exactly, not rounded the tidy way a URL a person reads is:
// a ring that shifted by a metre between pages would serve a pin sitting on
// its edge twice, or skip it.
export function nearLinkParams(near: NearFilter | null): Record<string, string> | null {
  return near ? { near: `${near.latitude},${near.longitude}`, within: `${near.radiusKm}km` } : null;
}
