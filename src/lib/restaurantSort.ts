import { distanceKm, type Place } from './distance';
import type { PinRatingJson } from './types';
import type { RestaurantMenu } from './restaurantMenus';

export type RestaurantDetails = { location?: Place; rating?: Pick<PinRatingJson, 'score' | 'scoreMax' | 'source' | 'url'>; menu?: RestaurantMenu };
export type RestaurantSort = 'rating' | 'distance' | 'opening-date' | 'lunch';
export function restaurantDistance(details?: RestaurantDetails, origin?: Place): number | undefined {
  const valid = (place?: Place) => !!place && Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90 && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180;
  return valid(details?.location) && valid(origin) ? distanceKm(origin!, details!.location!) : undefined;
}
export function restaurantRating(rating?: RestaurantDetails['rating']): number | undefined {
  return rating && Number.isFinite(rating.score) && Number.isFinite(rating.scoreMax) && rating.scoreMax > 0 && rating.score >= 0 && rating.score <= rating.scoreMax ? rating.score / rating.scoreMax : undefined;
}
export function sortRestaurants<T>(restaurants: T[], details: (restaurant: T) => RestaurantDetails | undefined, sort: RestaurantSort, origin?: Place, openingDate?: (restaurant: T) => string | undefined): T[] {
  const date = (restaurant: T) => { const value = Date.parse(openingDate?.(restaurant) ?? ''); return Number.isFinite(value) ? value : Infinity; };
  return restaurants.map((restaurant, index) => ({ restaurant, index })).sort((a, b) => {
    const left = details(a.restaurant); const right = details(b.restaurant);
    const difference = sort === 'opening-date' ? date(a.restaurant) - date(b.restaurant) : sort === 'distance'
      ? (restaurantDistance(left, origin) ?? Infinity) - (restaurantDistance(right, origin) ?? Infinity)
      : (restaurantRating(right?.rating) ?? -1) - (restaurantRating(left?.rating) ?? -1);
    return Number.isNaN(difference) || difference === 0 ? a.index - b.index : difference;
  }).map(({ restaurant }) => restaurant);
}
