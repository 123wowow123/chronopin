import { distanceKm, type Place } from './distance';
import type { PinRatingJson } from './types';
import type { RestaurantCardPhoto } from './restaurantPhotos';
import type { RestaurantMenu } from './restaurantMenus';
import { isDrinkCategory } from './menuCategories';

export type RestaurantDetails = { photos?: RestaurantCardPhoto[]; location?: Place; rating?: Pick<PinRatingJson, 'score' | 'scoreMax' | 'source' | 'url'>; menus?: RestaurantMenu[]; kidsFriendly?: boolean };
export type RestaurantSort = 'rating' | 'distance' | 'opening-date' | 'lunch' | 'starts' | 'food-price' | 'drink-price';
export function restaurantDistance(details?: RestaurantDetails, origin?: Place): number | undefined {
  const valid = (place?: Place) => !!place && Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90 && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180;
  return valid(details?.location) && valid(origin) ? distanceKm(origin!, details!.location!) : undefined;
}
export function restaurantRating(rating?: RestaurantDetails['rating']): number | undefined {
  return rating && Number.isFinite(rating.score) && Number.isFinite(rating.scoreMax) && rating.scoreMax > 0 && rating.score >= 0 && rating.score <= rating.scoreMax ? rating.score / rating.scoreMax : undefined;
}
// Median published price of a restaurant's food or drink items (one currency per restaurant:
// a menu in another currency than the first priced menu is ignored). Undefined when unpublished.
export function restaurantMenuPrice(menus: RestaurantMenu[] | undefined, kind: 'food' | 'drink'): number | undefined {
  const prices: number[] = []; let currency: string | undefined;
  for (const menu of menus ?? []) {
    for (const item of menu.items) {
      if (typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price <= 0) continue;
      if ((isDrinkCategory(item.category || 'Menu') ? 'drink' : 'food') !== kind) continue;
      const code = menu.currency ?? 'USD';
      if (currency && code !== currency) continue;
      currency = code; prices.push(item.price);
    }
  }
  if (!prices.length) return undefined;
  prices.sort((a, b) => a - b);
  const mid = prices.length >> 1;
  return prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
}
// `reverse` flips the natural direction (rating high to low, everything else low to high); restaurants
// with no value for the chosen sort stay last in guide order whichever way it runs.
export function sortRestaurants<T>(restaurants: T[], details: (restaurant: T) => RestaurantDetails | undefined, sort: RestaurantSort, origin?: Place, openingDate?: (restaurant: T) => string | undefined, reverse = false): T[] {
  const key = (restaurant: T): number | undefined => {
    const d = details(restaurant);
    if (sort === 'opening-date') { const value = Date.parse(openingDate?.(restaurant) ?? ''); return Number.isFinite(value) ? value : undefined; }
    if (sort === 'distance') return restaurantDistance(d, origin);
    if (sort === 'food-price' || sort === 'drink-price') return restaurantMenuPrice(d?.menus, sort === 'drink-price' ? 'drink' : 'food');
    const rating = restaurantRating(d?.rating);
    return rating === undefined ? undefined : -rating;
  };
  const flip = reverse ? -1 : 1;
  return restaurants.map((restaurant, index) => ({ restaurant, index, value: key(restaurant) })).sort((a, b) => {
    if (a.value === undefined || b.value === undefined) return a.value === b.value ? a.index - b.index : a.value === undefined ? 1 : -1;
    const difference = (a.value - b.value) * flip;
    return Number.isNaN(difference) || difference === 0 ? a.index - b.index : difference;
  }).map(({ restaurant }) => restaurant);
}
