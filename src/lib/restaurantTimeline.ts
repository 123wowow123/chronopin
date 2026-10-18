import type { PinJson } from './types';
import { pinDayKey } from './timeline';
import { compareDayKeys } from './format';

// Food alone includes products and news. Only venue tags make a restaurant.
export const RESTAURANT_TIMELINE_TAGS = ['Restaurant', 'Restaurants', 'Restaurant Opening', 'Restaurant Special', 'Top Restaurants'];
const names = new Set(RESTAURANT_TIMELINE_TAGS.map((name) => name.toLowerCase()));

export function isRestaurantPin(pin: Pick<PinJson, 'tags'>): boolean {
  return !!pin.tags?.some((tag) => typeof tag?.name === 'string' && names.has(tag.name.trim().toLowerCase()));
}

// Called on one viewer-local day. A restaurant is a fallback for an empty
// day, not another card to fill an unused slot beside news. Explicit focus
// links can still reveal the pin the reader asked to see.
export function timelineDayCandidates<T extends Pick<PinJson, 'id' | 'tags'>>(pins: T[], keepId?: number | null): T[] {
  return pins.some((pin) => !isRestaurantPin(pin))
    ? pins.filter((pin) => pin.id === keepId || !isRestaurantPin(pin))
    : pins;
}

// Live edits can introduce an event on a date already on screen even when
// its instant lies beyond the first/last card on that date. Do not add watch
// broadcasts or venue fallbacks without the server checking the whole day.
export function canJoinTimelineDay(
  pins: Pick<PinJson, 'allDay' | 'utcStartDateTime'>[],
  changed: Pick<PinJson, 'tags' | 'allDay' | 'utcStartDateTime' | 'utcCreatedDateTime'>,
  type: string, timeZone: string, createdSince?: Date | null,
): boolean {
  if (!pins.length || !['pin:save', 'pin:update'].includes(type) || isRestaurantPin(changed)) return false;
  if (createdSince && (!changed.utcCreatedDateTime || !(Date.parse(changed.utcCreatedDateTime) >= createdSince.getTime()))) return false;
  const day = pinDayKey(changed, timeZone);
  const days = pins.map((pin) => pinDayKey(pin, timeZone)).sort(compareDayKeys);
  return compareDayKeys(day, days[0]) >= 0 && compareDayKeys(day, days[days.length - 1]) <= 0;
}
