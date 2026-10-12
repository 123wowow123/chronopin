// What the restaurant guide pages ask the server for, 25 cards at a time
// (GET /api/restaurants/guide), shared by the server and the browser.

import type { Place } from './distance';
import type { ScheduledRestaurantOffer } from './restaurantOffers';
import type { RestaurantDetails, RestaurantSort } from './restaurantSort';
import type { Restaurant, TopRestaurant } from './restaurants';

export const GUIDE_PAGE_SIZE = 25;
export type GuideView = 'upcoming' | 'new' | 'top' | 'discounts';
export type GuideSection = 'available' | 'next';
export const GUIDE_VIEWS: GuideView[] = ['upcoming', 'new', 'top', 'discounts'];

// The view a guide page really shows: the requested one when it has content,
// otherwise the first populated one (what the bare city URL opens on).
export function guideDefaultView(counts: Record<GuideView, number>): GuideView {
  return GUIDE_VIEWS.find((item) => counts[item] > 0) ?? 'upcoming';
}
export function guideEffectiveView(counts: Record<GuideView, number>, requested?: string): GuideView {
  return GUIDE_VIEWS.find((item) => item === requested && counts[item] > 0) ?? guideDefaultView(counts);
}

// The one URL for a guide list. The default view's first page is the bare city
// path (not ?view=), so /restaurants/x and /restaurants/x?view=<default> do not
// serve identical content under two URLs.
export function guideListPath(slug: string, counts: Record<GuideView, number>, view: GuideView, page: number): string {
  const base = `/restaurants/${slug}`;
  const pageable = view !== 'discounts' && page > 1;
  if (view === guideDefaultView(counts) && !pageable) return base;
  return `${base}?view=${view}${pageable ? `&page=${page}` : ''}`;
}

// A page request without its offset. `section` is for the discounts view only.
export type GuideQuery = { region: string; view: GuideView; section?: GuideSection; neighborhood: string; sort: RestaurantSort; origin?: Place };

export type GuidePage<T> = {
  items: T[];
  // Where in the whole list the first item sits.
  offset: number;
  total: number;
  // Every id in the whole filtered, sorted list, for the map link.
  ids: (number | string)[];
  // Offers only: the south-west and north-east corners around every offer.
  bounds?: string;
  details: Record<number, RestaurantDetails>;
};
export type GuideItem = Restaurant | TopRestaurant | ScheduledRestaurantOffer;

// The coordinates only matter, and only count, when sorting by distance.
// Rounded to two decimals (about a kilometre) so nearby viewers share a key.
export function guideKey(query: GuideQuery): string {
  const origin = query.sort === 'distance' && query.origin ? `${query.origin.latitude.toFixed(2)},${query.origin.longitude.toFixed(2)}` : '';
  return [query.region, query.view, query.section ?? '', query.neighborhood, query.sort, origin].join('|');
}

export function guideSearchParams(query: GuideQuery, offset: number): URLSearchParams {
  const params = new URLSearchParams({ region: query.region, view: query.view, neighborhood: query.neighborhood, sort: query.sort, offset: String(offset) });
  if (query.section) params.set('section', query.section);
  if (query.sort === 'distance' && query.origin) {
    params.set('lat', String(query.origin.latitude));
    params.set('lon', String(query.origin.longitude));
  }
  return params;
}

// The crawlable URL of a page of a list: /restaurants/san-diego?view=new&page=2#new.
export function guidePageHref(pathname: string, view: GuideView, page: number, hash: string): string {
  return `${pathname}?view=${view}${page > 1 ? `&page=${page}` : ''}${hash}`;
}

export type GuideSummary = {
  counts: Record<GuideView, number>;
  neighborhoods: Record<GuideView, string[]>;
  // The restaurant in the hero, chosen from the openings.
  featured: Restaurant | null;
  featuredTop?: TopRestaurant | null;
};
