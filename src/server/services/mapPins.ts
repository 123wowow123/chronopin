// The pins the map plots. One answer, whatever the map is showing: a window
// of time around now, or a search. The map used to walk /api/main outward
// page by page - about fifteen serial round trips for the default year either
// side - carrying whole timeline pins so it could read a tenth of each, and
// downloading the half of all pins that have no place to plot at all.

import Pins from '../model/pins';
import { searchPins } from './search';
import { timelineMinConfidence } from './timeline';
import { toJson, type MapPinJson, type PinJson } from '@/lib/types';
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
    utcCreatedDateTime: pin.utcCreatedDateTime,
    latitude: pin.latitude,
    longitude: pin.longitude,
    media: pin.media?.map((medium) => ({ type: medium.type, thumbName: medium.thumbName, originalUrl: medium.originalUrl })),
  };
}

export async function mapPins(query: MapQuery): Promise<MapPinJson[]> {
  // A search already answers with every match at once; it is the window and
  // the missing places that are narrowed here instead of in the browser.
  if (query.q.trim()) {
    const found = await searchPins(query.q, { userId: query.userId, onlyWatched: query.onlyWatched, timeZone: query.timeZone });
    let pins = found.pins as unknown as PinJson[];
    // Search uses lean timeline rows, which omit tags. Load the matched
    // pins' full records before applying the restaurant tag filter.
    if (query.restaurantsOnly && pins.some((pin) => !pin.tags?.length)) {
      pins = toJson<PinJson[]>((await Pins.queryByIds(pins.map((pin) => pin.id))).pins);
    }
    // The guide's local snapshot also needs coordinates in the map API.
    // Only supplement explicit ID searches, never broader or watched results.
    if (process.env.NODE_ENV === 'development' && !query.onlyWatched && /^(?:pin:\d+(?:,\d+)*\s*)+$/i.test(query.q.trim())) {
      const existing = new Set(pins.map((pin) => pin.id));
      const missing = parseSearchQuery(query.q).ids.filter((id) => !existing.has(id));
      pins.push(...await restaurantPreviewPins(missing));
    }
    return pins
      .filter((pin) => !query.restaurantsOnly || (pin.categories?.includes('Food') && pin.tags?.some((tag) => /^(Restaurant Opening|Restaurants?)$/i.test(tag.name))))
      .filter((pin) => pin.latitude != null && pin.longitude != null)
      .filter((pin) => !query.createdSince || !pin.utcCreatedDateTime || new Date(pin.utcCreatedDateTime) >= query.createdSince!)
      .filter((pin) => inWindow(pin.utcStartDateTime, query))
      .map(toMapPin);
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
  const pins = rows as MapPinJson[];
  if (query.restaurantsOnly && !query.onlyWatched) {
    const existing = new Set(pins.map((pin) => pin.id));
    const previews = await restaurantPreviewPins();
    pins.push(...previews.filter((pin) => !existing.has(pin.id))
      .filter((pin) => !query.createdSince || !pin.utcCreatedDateTime || new Date(pin.utcCreatedDateTime) >= query.createdSince!)
      .filter((pin) => inWindow(pin.utcStartDateTime, query)).map(toMapPin));
  }
  return pins;
}

function inWindow(start: string | undefined, { from, to }: MapQuery) {
  if (!start) {
    return true;
  }
  const at = new Date(start).getTime();
  return (!from || at >= from.getTime()) && (!to || at <= to.getTime());
}
