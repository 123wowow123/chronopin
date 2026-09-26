// The pins the map plots. One answer, whatever the map is showing: a window
// of time around now, or a search. The map used to walk /api/main outward
// page by page - about fifteen serial round trips for the default year either
// side - carrying whole timeline pins so it could read a tenth of each, and
// downloading the half of all pins that have no place to plot at all.

import Pins from '../model/pins';
import { searchPins } from './search';
import { timelineMinConfidence } from './timeline';
import type { MapPinJson, PinJson } from '@/lib/types';

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
    return (found.pins as unknown as PinJson[])
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
  });
  return rows as MapPinJson[];
}

function inWindow(start: string | undefined, { from, to }: MapQuery) {
  if (!start) {
    return true;
  }
  const at = new Date(start).getTime();
  return (!from || at >= from.getTime()) && (!to || at <= to.getTime());
}
