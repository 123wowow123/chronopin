// The pins the map plots. One answer, whatever the map is showing: a window
// of time around now, or a search. The map used to walk /api/main outward
// page by page - about fifteen serial round trips for the default year either
// side - carrying whole timeline pins so it could read a tenth of each, and
// downloading the half of all pins that have no place to plot at all.

import Pins from '../model/pins';
import { searchPinIds } from './search';
import { timelineMinConfidence } from './timeline';
import { restaurantPriceRange } from '@/server/restaurantPrice';
import { type MapPinJson, type PinJson } from '@/lib/types';
import { parseSearchQuery } from '../util/searchQuery';
import { restaurantPreviewPins } from './restaurantPreview';

export type MapQuery = {
  // When the plotted pins start; null either side for unbounded.
  from: Date | null;
  to: Date | null;
  createdSince: Date | null;
  // A search's text, empty for the plain time window.
  q: string;
  onlyWatched: boolean;
  userId: number | null;
  // The zone a search's date: and posted: days are the viewer's in.
  timeZone: string;
  restaurantsOnly?: boolean;
};

// Everything off a pin that a marker reads. Applied to a search's results,
// which come back as whole pins; the time-window query selects these columns
// in the first place.
export function toMapPin(pin: PinJson): MapPinJson {
  return {
    id: pin.id,
    title: pin.title,
    address: pin.address,
    categories: pin.categories ?? [],
    allDay: pin.allDay,
    utcStartDateTime: pin.utcStartDateTime,
    utcEndDateTime: pin.utcEndDateTime,
    utcCreatedDateTime: pin.utcCreatedDateTime,
    latitude: pin.latitude,
    longitude: pin.longitude,
    price: pin.price,
    priceCurrency: pin.priceCurrency,
    restaurantPriceRange: pin.restaurantPriceRange ?? restaurantPriceRange(pin.sourceUrl),
    media: pin.media?.map((medium) => ({ type: medium.type, thumbName: medium.thumbName, originalUrl: medium.originalUrl })),
  };
}

export async function mapPins(query: MapQuery): Promise<MapPinJson[]> {
  // A search already answers with every match at once; it is the window and
  // the missing places that are narrowed here instead of in the browser.
  if (query.q.trim()) {
    const ids = await searchPinIds(query.q, { userId: query.userId, onlyWatched: query.onlyWatched, timeZone: query.timeZone });
    const rows = await Pins.queryForMapByIds(ids, { from: query.from, to: query.to, createdSince: query.createdSince, restaurantsOnly: query.restaurantsOnly });
    const pins = withPriceRange(rows);
    // The guide's local snapshot also needs coordinates in the map API.
    // Only supplement explicit ID searches, never broader or watched results.
    if (process.env.NODE_ENV === 'development' && !query.onlyWatched && /^(?:pin:\d+(?:,\d+)*\s*)+$/i.test(query.q.trim())) {
      const existing = new Set(ids);
      const missing = parseSearchQuery(query.q).ids.filter((id) => !existing.has(id));
      pins.push(...(await restaurantPreviewPins(missing))
        .filter((pin) => !query.createdSince || !pin.utcCreatedDateTime || new Date(pin.utcCreatedDateTime) >= query.createdSince!)
        .filter((pin) => inWindow(pin.utcStartDateTime, query)).map(toMapPin));
    }
    return pins;
  }

  const rows = await Pins.queryForMap({
    from: query.from,
    to: query.to,
    createdSince: query.createdSince,
    // A watched map keeps every pin the viewer watches, as a watched timeline
    // keeps every pin it lists.
    minConfidence: query.onlyWatched ? null : await timelineMinConfidence(),
    favoriteUserId: query.onlyWatched ? query.userId : null,
    restaurantsOnly: query.restaurantsOnly,
  });
  // The $-$$$$ range is looked up by source URL, which the marker itself
  // does not carry.
  const pins = withPriceRange(rows);
  if (query.restaurantsOnly && !query.onlyWatched) {
    const existing = new Set(pins.map((pin) => pin.id));
    const previews = await restaurantPreviewPins();
    pins.push(...previews.filter((pin) => !existing.has(pin.id))
      .filter((pin) => !query.createdSince || !pin.utcCreatedDateTime || new Date(pin.utcCreatedDateTime) >= query.createdSince!)
      .filter((pin) => inWindow(pin.utcStartDateTime, query)).map(toMapPin));
  }
  return pins;
}

function withPriceRange(rows: Record<string, unknown>[]): MapPinJson[] {
  return rows.map(({ sourceUrl, ...row }) => ({ ...row, restaurantPriceRange: restaurantPriceRange(sourceUrl as string | null) })) as MapPinJson[];
}

function inWindow(start: string | undefined, { from, to }: MapQuery) {
  if (!start) {
    return true;
  }
  const at = new Date(start).getTime();
  return (!from || at >= from.getTime()) && (!to || at <= to.getTime());
}

// Pins plotted a moment ago, shared by the map's own request and its layer
// counts, and by every viewer of the same window. The browser's boundaries
// are resolved from its own clock to the millisecond, so the key rounds them
// to the minute; a watched map is the viewer's alone and never kept.
const CACHE_MS = 30_000;
const CACHE_MAX = 200;
const recent = new Map<string, { at: number; pins: Promise<MapPinJson[]> }>();

export function cachedMapPins(query: MapQuery): Promise<MapPinJson[]> {
  if (query.onlyWatched) return mapPins(query);
  const minute = (date: Date | null) => (date ? Math.floor(date.getTime() / 60_000) : null);
  const key = JSON.stringify([query.q, query.timeZone, query.restaurantsOnly ?? false, minute(query.from), minute(query.to), minute(query.createdSince)]);
  const now = Date.now();
  const hit = recent.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit.pins;
  for (const [k, v] of recent) if (now - v.at >= CACHE_MS) recent.delete(k);
  if (recent.size >= CACHE_MAX) recent.delete(recent.keys().next().value!);
  const pins = mapPins(query);
  recent.set(key, { at: now, pins });
  // A failed load is not kept.
  pins.catch(() => { if (recent.get(key)?.pins === pins) recent.delete(key); });
  return pins;
}
