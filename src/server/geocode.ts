// A name for a point, for a default location set from the device: the
// browser gives coordinates, and the profile should say "Brooklyn, New York,
// United States" rather than a pair of numbers. Nominatim (OpenStreetMap) is
// the only reverse geocoder the project uses; its terms ask for at most one
// request a second and a User-Agent that says who is asking, so calls are
// spaced and cached. The point arrives rounded to about a kilometre
// (src/lib/location.ts), which is also what makes the cache worth keeping.

import log from './util/log';

const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const HEADERS = { 'User-Agent': 'chronopin (default location; contact via chronopin.app)' };
const TIMEOUT_MS = 8000;
const SPACING_MS = 1100;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 5000;

const state = ((globalThis as any).__chronopinGeocode ??= {
  cache: new Map<string, { name: string | null; expires: number }>(),
  last: 0,
  chain: Promise.resolve() as Promise<unknown>,
}) as { cache: Map<string, { name: string | null; expires: number }>; last: number; chain: Promise<unknown> };

// One request at a time, a little over a second apart.
function spaced<T>(run: () => Promise<T>): Promise<T> {
  const next = state.chain.then(async () => {
    const wait = SPACING_MS - (Date.now() - state.last);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    state.last = Date.now();
    return run();
  });
  state.chain = next.catch(() => undefined);
  return next;
}

// The town or city, its region and country, in `language`; null when
// Nominatim names nothing there (open sea) or cannot be reached - a location
// without a name still works, it is only shown as coordinates.
export async function nameForPoint(latitude: number, longitude: number, language = 'en'): Promise<string | null> {
  const key = `${language}|${latitude.toFixed(2)}|${longitude.toFixed(2)}`;
  const hit = state.cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.name;
  try {
    const name = await spaced(async () => {
      const url = `${REVERSE_URL}?format=jsonv2&addressdetails=1&zoom=10&accept-language=${encodeURIComponent(language)}&lat=${latitude}&lon=${longitude}`;
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`reverse geocode ${res.status}`);
      const body = (await res.json()) as { address?: Record<string, string>; name?: string };
      const a = body.address ?? {};
      const place = a.city ?? a.town ?? a.village ?? a.municipality ?? a.suburb ?? a.county ?? body.name ?? null;
      const region = a.state ?? a.region ?? a.province ?? null;
      const parts = [place, region && region !== place ? region : null, a.country ?? null].filter(Boolean);
      return parts.length ? parts.join(', ').slice(0, 200) : null;
    });
    state.cache.set(key, { name, expires: Date.now() + TTL_MS });
    if (state.cache.size > CACHE_LIMIT) state.cache.delete(state.cache.keys().next().value!);
    return name;
  } catch (err) {
    log.warn('nameForPoint', (err as Error).message);
    return null;
  }
}
