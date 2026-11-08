import { restaurantCardPhotos, restaurantProfilePhotos } from '@/lib/restaurantPhotos';
import { restaurantPinPhotos } from './restaurantPhotos';
import * as db from '@/server/db';
import { listSpecialVenues } from '@/server/model/restaurantSpecialVenue';
import { restaurantMenuFor, restaurantSourceKey } from '@/lib/restaurantMenus';
import { restaurantDetailsFor } from '@/lib/restaurantDetails';
import { listRestaurantContent } from '@/server/model/restaurantContent';
import { restaurantRating, type RestaurantDetails } from '@/lib/restaurantSort';
import type { Restaurant, TopRestaurant } from '@/lib/restaurants';
import type { PinRatingJson } from '@/lib/types';

export function hasKidsMenu(menu?: { items?: { name?: string; category?: string }[]; label?: string; note?: string }): boolean {
  if (!menu) return false;
  const isKid = (text?: string) => Boolean(text && /\b(?:kids?|children)(?:'s)?\b/i.test(text));
  if (isKid(menu.label) || isKid(menu.note)) return true;
  return (menu.items || []).some((item) => isKid(item.category) || isKid(item.name));
}

export async function restaurantGuideDetails(restaurants: Restaurant[], tops: TopRestaurant[]): Promise<Record<number, RestaurantDetails>> {
  const sources = [...restaurants.map((r) => ({ id: r.id, source: r.sourceUrl, kidsFriendly: r.kidsFriendly })), ...tops.map((r) => ({ id: r.pinId, source: r.sourceUrl, kidsFriendly: r.kidsFriendly }))];
  if (!sources.length) return {};
  const [pins, venues, content, photos] = await Promise.all([
    db.query<{ id: number; latitude: number | null; longitude: number | null; ratings: PinRatingJson[] | null; tags: string[] | null }>(`SELECT p."id", ST_Y(p."location"::geometry) AS latitude, ST_X(p."location"::geometry) AS longitude,
      (SELECT jsonb_agg(jsonb_build_object('score', r."score", 'scoreMax', r."scoreMax", 'source', r."source", 'url', r."url") ORDER BY r."source") FROM "PinRating" r WHERE r."pinId" = p."id") AS ratings,
      (SELECT array_agg(t."name"::text) FROM "PinTag" t WHERE t."pinId" = p."id") AS tags
      FROM "Pin" p WHERE p."id" = ANY($1::int[]) AND p."utcDeletedDateTime" IS NULL`, [[...new Set(sources.map((r) => r.id))]]),
    listSpecialVenues(),
    listRestaurantContent({ sources: sources.flatMap((source) => source.source ? [source.source] : []) }),
    restaurantPinPhotos(sources.map((source) => source.id)),
  ]);
  const result: Record<number, RestaurantDetails> = {};
  for (const pin of pins) {
    const rating = pin.ratings?.find((r) => restaurantRating(r) !== undefined);
    const tagKids = pin.tags?.some((tag) => /^(?:kids?|family|children)(?: friendly)?$/i.test(tag));
    result[pin.id] = { rating, ...(pin.latitude != null && pin.longitude != null ? { location: { latitude: pin.latitude, longitude: pin.longitude } } : {}), ...(tagKids ? { kidsFriendly: true } : {}) };
  }
  for (const source of sources) {
    const record = content.find((record) => restaurantSourceKey(record.profile.pinSourceUrl) === restaurantSourceKey(source.source ?? ''));
    const detailsProfile = record?.profile.details ?? (source.source ? restaurantDetailsFor(source.source) : undefined);
    const tileProfile = record?.profile.tile;
    const allMenus = record?.profile.menu?.menus ?? (source.source ? restaurantMenuFor(source.source)?.menus : undefined) ?? [];
    const kidsMenuPresent = allMenus.some(hasKidsMenu);
    const explicitKids = source.kidsFriendly ?? detailsProfile?.kidsFriendly ?? tileProfile?.kidsFriendly;
    const kidsFriendly = explicitKids !== undefined ? explicitKids : (kidsMenuPresent ? true : undefined);
    if (kidsFriendly !== undefined) {
      result[source.id] = { ...result[source.id], kidsFriendly };
    }
    const profile = venues.find((v) => restaurantSourceKey(v.profile.pinSourceUrl) === restaurantSourceKey(source.source ?? ''))?.profile;
    result[source.id] = { ...result[source.id], photos: restaurantCardPhotos([
      ...photos[source.id] ?? [], ...restaurantProfilePhotos(record?.profile.menu), ...restaurantProfilePhotos(profile),
    ]) };
    // Match native pin precedence without discarding later dishes or menus.
    const mergedMenus = new Map((record?.profile.menu?.menus ?? []).map((menu) => [menu.label, menu]));
    for (const menu of profile?.menus ?? []) mergedMenus.set(menu.label, menu);
    const menus = [...mergedMenus.values()].filter((menu) => menu.items.length || menu.pages?.length || menu.coverage === 'link');
    result[source.id] = { ...result[source.id], menus };
    if (!profile) continue;
    const venueKids = profile.menus?.some(hasKidsMenu);
    result[source.id] = {
      ...result[source.id],
      ...(profile.location ? { location: profile.location } : {}),
      ...(profile.review ? { rating: { score: profile.review.score, scoreMax: 5, source: profile.review.provider, url: profile.review.sourceUrl } } : {}),
      ...(venueKids && result[source.id]?.kidsFriendly === undefined ? { kidsFriendly: true } : {}),
    };
  }
  return result;
}
