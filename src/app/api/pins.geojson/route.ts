import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { HttpError, route } from '@/server/http';
import { cachedMapPins } from '@/server/services/mapPins';
import { resolveCreatedSince } from '@/server/util/createdFilter';
import { requestTimeZone } from '@/server/viewer';
import { pinPath } from '@/lib/seo';
import { siteUrl } from '@/lib/appConfig';

// The located pins as GeoJSON points, for GIS tools (QGIS, geojson.io, Mapbox).
// Takes the same filters as /api/pins/map:
// GET /api/pins.geojson?q=company:Micron&from=ISO&to=ISO&created_within=1w
// Coordinates are [longitude, latitude], as GeoJSON has them.
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const user = await getUser(request);
  const pins = await cachedMapPins({
    from: instant(params.get('from'), 'from'),
    to: instant(params.get('to'), 'to'),
    createdSince: resolveCreatedSince({ created_since: params.get('created_since'), created_within: params.get('created_within') }),
    q: params.get('q') || '',
    onlyWatched: params.get('f')?.toLowerCase() === 'watch' && !!user,
    userId: user?.id ?? null,
    timeZone: requestTimeZone(request),
    restaurantsOnly: params.get('show') === 'restaurants',
  });
  const features = pins
    .filter((pin) => typeof pin.latitude === 'number' && typeof pin.longitude === 'number')
    .map((pin) => ({
      type: 'Feature' as const,
      id: pin.id,
      geometry: { type: 'Point' as const, coordinates: [pin.longitude, pin.latitude] },
      properties: {
        title: pin.title,
        url: siteUrl + pinPath(pin),
        address: pin.address ?? null,
        categories: pin.categories ?? [],
        allDay: pin.allDay,
        start: pin.utcStartDateTime ?? null,
        end: pin.utcEndDateTime ?? null,
        megawatts: pin.megawatts ?? null,
      },
    }));
  return new Response(JSON.stringify({ type: 'FeatureCollection', features }), {
    headers: { 'Content-Type': 'application/geo+json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
});

function instant(value: string | null, name: string) {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new HttpError(400, `${name} is not a date: '${value}'`);
  return date;
}
