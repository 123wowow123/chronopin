// Places as they are typed, for a listing's location: street addresses,
// streets, neighbourhoods, towns, counties, regions and postcodes, from
// Photon (komoot's OpenStreetMap search, made for search-as-you-type; the
// Open-Meteo geocoder the profile uses knows towns alone). Answers lean
// towards `near`, so "san diego" puts the Californian city first for a
// seller in California.
//
// What a listing keeps and shows is never finer than a neighbourhood: an
// address, a street or a business is saved as the area around it ("Banker's
// Hill, San Diego, California 92101"), since the listing is public and says
// its location is approximate.

import { LOCATION_NAME_MAX } from '@/lib/location';
import type { PlaceKind, PlaceSuggestion } from '@/lib/placeSuggestion';
import log from './util/log';

const PHOTON_URL = 'https://photon.komoot.io/api/';
const HEADERS = { 'User-Agent': 'chronopin (listing location autocomplete; contact via chronopin.app)' };
const TIMEOUT_MS = 6000;
const LIMIT = 8;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 5000;
// The languages Photon names places in; others get each place's local name.
const PHOTON_LANGS = new Set(['en', 'de', 'fr']);

const cache = ((globalThis as any).__chronopinPlaceSearch ??= new Map()) as Map<string, { places: PlaceSuggestion[]; expires: number }>;

type Props = Partial<Record<'name' | 'housenumber' | 'street' | 'postcode' | 'district' | 'locality' | 'city' | 'county' | 'state' | 'country' | 'type' | 'osm_key' | 'osm_value', string>>;

const join = (parts: (string | null | undefined)[]) => {
  const out: string[] = [];
  for (const part of parts) if (part && !out.includes(part)) out.push(part);
  return out.join(', ');
};

function kindOf(p: Props): PlaceKind {
  if (p.osm_key === 'place' && p.osm_value === 'postcode') return 'postcode';
  switch (p.type) {
    case 'country':
      return 'country';
    case 'state':
      return 'region';
    case 'county':
      return 'county';
    case 'city':
      return 'city';
    case 'district':
    case 'locality':
      return 'neighborhood';
    case 'street':
      return 'street';
  }
  if (p.name && p.osm_key !== 'place' && p.osm_key !== 'building') return 'place';
  return 'address';
}

// A state with its postcode after it, the way an address ends.
const statePostcode = (p: Props) => [p.state, p.postcode].filter(Boolean).join(' ') || null;

function toSuggestion(p: Props, [longitude, latitude]: number[]): PlaceSuggestion | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const kind = kindOf(p);
  const town = p.city ?? p.locality ?? p.county;
  let label: string;
  let detail: string;
  let name: string;
  switch (kind) {
    case 'country':
      label = p.name ?? p.country ?? '';
      detail = '';
      name = label;
      break;
    case 'region':
      label = p.name ?? '';
      detail = join([p.country]);
      name = join([label, p.country]);
      break;
    case 'county':
    case 'city':
      label = p.name ?? '';
      detail = join([p.state, p.country]);
      name = join([label, p.state, p.country]);
      break;
    case 'neighborhood':
      label = p.name ?? '';
      detail = join([p.city, statePostcode(p), p.country]);
      name = join([label, p.city, statePostcode(p), p.country]);
      break;
    case 'postcode':
      label = p.name ?? p.postcode ?? '';
      detail = join([p.district, town, p.state, p.country]);
      name = join([town, [p.state, label].filter(Boolean).join(' '), p.country]);
      break;
    default: {
      // An address, a street or a business: shown in full to pick, kept as
      // the area around it.
      const street = [p.housenumber, p.street].filter(Boolean).join(' ');
      label = kind === 'street' ? (p.name ?? p.street ?? '') : kind === 'place' ? p.name! : street || p.name || '';
      detail = join([kind === 'place' ? street : null, p.district, town, statePostcode(p), p.country]);
      name = join([p.district, town, statePostcode(p), p.country]);
    }
  }
  if (!label || !name) return null;
  return { latitude: Math.round(latitude * 100) / 100, longitude: Math.round(longitude * 100) / 100, name: name.slice(0, LOCATION_NAME_MAX), label, detail, kind };
}

const AREA_LAYERS = ['city', 'county', 'state', 'country'];

// An answer with the country it is in, to tell the seller's own apart.
type Found = { place: PlaceSuggestion; country: string | null };

async function photon(params: URLSearchParams): Promise<Found[]> {
  const res = await fetch(`${PHOTON_URL}?${params}`, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`photon ${res.status}`);
  const body = (await res.json()) as { features?: { properties?: Props; geometry?: { coordinates?: number[] } }[] };
  const found: Found[] = [];
  for (const f of body.features ?? []) {
    const place = toSuggestion(f.properties ?? {}, f.geometry?.coordinates ?? []);
    if (place) found.push({ place, country: f.properties?.country ?? null });
  }
  return found;
}

export async function autocompletePlaces(query: string, language = 'en', near?: { latitude: number; longitude: number } | null): Promise<PlaceSuggestion[]> {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  const lang = PHOTON_LANGS.has(language) ? language : 'default';
  // Near to a tenth of a degree is near enough to rank by, and caches well.
  const bias = near ? { lat: near.latitude.toFixed(1), lon: near.longitude.toFixed(1) } : null;
  const key = ['v3', lang, bias?.lat, bias?.lon, q.toLowerCase()].join('|');
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.places;

  // Two asks at once: everything, leaning near (the streets, businesses and
  // neighbourhoods around the seller), and towns and wider areas anywhere -
  // leaning near, "califor" is all Californian streets and never the state.
  const [nearby, areas] = await Promise.all([
    photon(new URLSearchParams({ q, limit: String(LIMIT), lang, ...(bias ?? {}) })),
    photon(new URLSearchParams([['q', q], ['limit', '4'], ['lang', lang], ...AREA_LAYERS.map((layer) => ['layer', layer])])),
  ]);
  // Areas first, the nearby ones ahead; then addresses, streets and
  // businesses - addresses leading those when a house number is typed.
  // From the search anywhere, a town or county only in the seller's own
  // country ("north par" should not offer North Paravur, Kerala); states
  // and countries from anywhere.
  const home = bias ? nearby[0]?.country : null;
  const wide = areas.filter(({ place, country }) => !home || place.kind === 'region' || place.kind === 'country' || country === home);
  const isArea = (p: PlaceSuggestion) => p.kind !== 'address' && p.kind !== 'street' && p.kind !== 'place';
  const rest = nearby.map((f) => f.place).filter((p) => !isArea(p));
  if (/^\d+\s+\D/.test(q)) rest.sort((a, b) => Number(b.kind === 'address') - Number(a.kind === 'address'));
  const places: PlaceSuggestion[] = [];
  for (const place of [...nearby.map((f) => f.place).filter(isArea), ...wide.map((f) => f.place), ...rest]) {
    if (places.length < LIMIT && !places.some((p) => p.label === place.label && p.detail === place.detail)) places.push(place);
  }
  cache.set(key, { places, expires: Date.now() + TTL_MS });
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  return places;
}

export function logPlaceSearchError(err: unknown) {
  log.warn('autocompletePlaces', (err as Error)?.message);
}
