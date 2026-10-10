import * as db from '@/server/db';
import { listSpecialVenues } from '@/server/model/restaurantSpecialVenue';
import { restaurantMenuFor, restaurantSourceKey } from '@/lib/restaurantMenus';
import { restaurantRating, type RestaurantDetails } from '@/lib/restaurantSort';
import type { Restaurant, TopRestaurant } from '@/lib/restaurants';
import type { PinRatingJson } from '@/lib/types';

export async function restaurantGuideDetails(restaurants: Restaurant[], tops: TopRestaurant[]): Promise<Record<number, RestaurantDetails>> {
  const sources = [...restaurants.map((r) => ({ id: r.id, source: r.sourceUrl })), ...tops.map((r) => ({ id: r.pinId, source: r.sourceUrl }))];
  if (!sources.length) return {};
  const [pins, venues] = await Promise.all([
    db.query<{ id: number; latitude: number | null; longitude: number | null; ratings: PinRatingJson[] | null }>(`SELECT p."id", ST_Y(p."location"::geometry) AS latitude, ST_X(p."location"::geometry) AS longitude,
      (SELECT jsonb_agg(jsonb_build_object('score', r."score", 'scoreMax', r."scoreMax", 'source', r."source", 'url', r."url") ORDER BY r."source") FROM "PinRating" r WHERE r."pinId" = p."id") AS ratings
      FROM "Pin" p WHERE p."id" = ANY($1::int[]) AND p."utcDeletedDateTime" IS NULL`, [[...new Set(sources.map((r) => r.id))]]),
    listSpecialVenues(),
  ]);
  const result: Record<number, RestaurantDetails> = {};
  for (const pin of pins) {
    const rating = pin.ratings?.find((r) => restaurantRating(r) !== undefined);
    result[pin.id] = { rating, ...(pin.latitude != null && pin.longitude != null ? { location: { latitude: pin.latitude, longitude: pin.longitude } } : {}) };
  }
  for (const source of sources) {
    const menu = restaurantMenuFor(source.source)?.menus.find((menu) => menu.items.length);
    if (menu) result[source.id] = { ...result[source.id], menu: { ...menu, coverage: 'sample', items: menu.items.slice(0, 6) } };
    const profile = venues.find((v) => restaurantSourceKey(v.profile.pinSourceUrl) === restaurantSourceKey(source.source ?? ''))?.profile;
    if (!profile) continue;
    result[source.id] = { ...result[source.id], ...(profile.location ? { location: profile.location } : {}), ...(profile.review ? { rating: { score: profile.review.score, scoreMax: 5, source: profile.review.provider, url: profile.review.sourceUrl } } : {}) };
  }
  return result;
}
