import { openingGroup } from './restaurants';

export const RESTAURANT_TAB_TARGET = 12;
export const CHINA_RESTAURANT_TAB_TARGET = 35;

export function restaurantTabTarget(country: string) {
  return country === 'China' ? CHINA_RESTAURANT_TAB_TARGET : RESTAURANT_TAB_TARGET;
}

export function restaurantTabCoverage(openings: { id: number; day: string; confirmed: boolean }[], topPinIds: number[], today: string, options: { target?: number; specialRestaurantIds?: string[] } = {}) {
  const target = options.target ?? RESTAURANT_TAB_TARGET;
  const unique = [...new Map(openings.map((pin) => [pin.id, pin])).values()];
  const counts = {
    upcoming: unique.filter((pin) => openingGroup(pin, today) === 'upcoming').length,
    new: unique.filter((pin) => openingGroup(pin, today) === 'new').length,
    top: new Set(topPinIds).size,
    discounts: new Set(options.specialRestaurantIds ?? []).size,
  };
  const needed = {
    upcoming: Math.max(0, target - counts.upcoming),
    new: Math.max(0, target - counts.new),
    top: Math.max(0, target - counts.top),
    discounts: Math.max(0, target - counts.discounts),
  };
  return { targetPerTab: target, counts, needed };
}
