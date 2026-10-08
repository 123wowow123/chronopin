import { openingGroup } from './restaurants';

export const RESTAURANT_TAB_TARGET = 12;

export function restaurantTabCoverage(openings: { id: number; day: string; confirmed: boolean }[], topPinIds: number[], today: string) {
  const unique = [...new Map(openings.map((pin) => [pin.id, pin])).values()];
  const counts = {
    upcoming: unique.filter((pin) => openingGroup(pin, today) === 'upcoming').length,
    new: unique.filter((pin) => openingGroup(pin, today) === 'new').length,
    top: new Set(topPinIds).size,
  };
  const needed = {
    upcoming: Math.max(0, RESTAURANT_TAB_TARGET - counts.upcoming),
    new: Math.max(0, RESTAURANT_TAB_TARGET - counts.new),
    top: Math.max(0, RESTAURANT_TAB_TARGET - counts.top),
  };
  return { targetPerTab: RESTAURANT_TAB_TARGET, counts, needed };
}
