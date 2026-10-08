import { cacheLife, cacheTag } from 'next/cache';
import { dayKeyIn } from '@/lib/format';
import { GUIDE_PAGE_SIZE, type GuideItem, type GuidePage, type GuideQuery, type GuideSummary, type GuideView } from '@/lib/restaurantGuide';
import { restaurantOfferSections } from '@/lib/restaurantOffers';
import { sortRestaurants } from '@/lib/restaurantSort';
import { RESTAURANT_REGIONS, openingGroup } from '@/lib/restaurants';
import { TAGS } from './cache';
import { restaurantGuideDetails } from './restaurantGuideDetails';
import { regionalRestaurantOffers } from './restaurantOffers';
import { regionalRestaurants, regionalTopRestaurants } from './restaurants';

// Everything one region's guide is built from, kept for a few minutes so a
// reader paging through a list does not rebuild it for every 25 cards.
async function guideBase(regionSlug: string) {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  const region = RESTAURANT_REGIONS.find((item) => item.slug === regionSlug)!;
  const [data, tops] = await Promise.all([regionalRestaurants(region.name), regionalTopRestaurants(region.slug)]);
  const today = dayKeyIn(new Date(), region.timeZone);
  const [offers, details] = await Promise.all([regionalRestaurantOffers(data.restaurants, tops, today, region.slug), restaurantGuideDetails(data.restaurants, tops)]);
  const active = data.restaurants.filter((restaurant) => openingGroup(restaurant, today));
  return {
    today, tops, offers, details, previewSnapshot: data.previewSnapshot,
    upcoming: active.filter((restaurant) => openingGroup(restaurant, today) === 'upcoming').sort((a, b) => a.day.localeCompare(b.day)),
    recent: active.filter((restaurant) => openingGroup(restaurant, today) === 'new').sort((a, b) => b.day.localeCompare(a.day)),
  };
}

export async function guideSummary(regionSlug: string, now: Date): Promise<(GuideSummary & { today: string; previewSnapshot: boolean }) | null> {
  const region = RESTAURANT_REGIONS.find((item) => item.slug === regionSlug);
  if (!region) return null;
  const { today, tops, offers, upcoming, recent, previewSnapshot } = await guideBase(region.slug);
  const sections = restaurantOfferSections(offers, now, region.timeZone);
  const names = (list: { neighborhood: string }[]) => [...new Set(list.map((item) => item.neighborhood))].sort();
  const featured = recent.find((restaurant) => restaurant.id === 6434 && restaurant.image) ?? recent.find((restaurant) => restaurant.image && !restaurant.imageNote) ?? recent.find((restaurant) => restaurant.image) ?? upcoming.find((restaurant) => restaurant.image) ?? null;
  return {
    today, previewSnapshot, featured,
    counts: { upcoming: upcoming.length, new: recent.length, top: tops.length, discounts: sections.available.length + sections.upcoming.length },
    neighborhoods: { upcoming: names(upcoming), new: names(recent), top: names(tops), discounts: names(offers) },
  };
}

// One page of one list, ordered and filtered the way the guide shows it.
export async function guidePage(query: GuideQuery, offset: number, now: Date, limit = GUIDE_PAGE_SIZE): Promise<GuidePage<GuideItem> | null> {
  const region = RESTAURANT_REGIONS.find((item) => item.slug === query.region);
  if (!region) return null;
  const { tops, offers, details, upcoming, recent } = await guideBase(region.slug);
  const matches = (item: { neighborhood: string }) => query.neighborhood === 'all' || item.neighborhood === query.neighborhood;
  const withDetails = (items: GuideItem[], idOf: (item: any) => number): GuidePage<GuideItem>['details'] => Object.fromEntries(items.flatMap((item) => (details[idOf(item)] ? [[idOf(item), details[idOf(item)]]] : [])));
  const view: GuideView = query.view;
  if (view === 'discounts') {
    const sections = restaurantOfferSections(offers.filter(matches), now, region.timeZone, { sort: query.sort === 'distance' || query.sort === 'lunch' ? query.sort : 'rating', origin: query.origin });
    const list = query.section === 'next' ? sections.upcoming : sections.available;
    const located = list.flatMap((offer) => offer.location && Number.isFinite(offer.location.latitude) && Math.abs(offer.location.latitude) <= 90 && Number.isFinite(offer.location.longitude) && Math.abs(offer.location.longitude) <= 180 ? [offer.location] : []);
    const bounds = located.length ? [Math.min(...located.map((place) => place.latitude)), Math.min(...located.map((place) => place.longitude)), Math.max(...located.map((place) => place.latitude)), Math.max(...located.map((place) => place.longitude))].join(',') : undefined;
    return { items: list.slice(offset, offset + limit), offset, total: list.length, ids: list.map((offer) => offer.id), bounds, details: {} };
  }
  if (view === 'top') {
    const list = sortRestaurants(tops.filter(matches), (r) => details[r.pinId], query.sort, query.origin);
    const items = list.slice(offset, offset + limit);
    return { items, offset, total: list.length, ids: list.map((r) => r.pinId), details: withDetails(items, (r) => r.pinId) };
  }
  const source = view === 'upcoming' ? upcoming : recent;
  const list = sortRestaurants(source.filter(matches), (r) => details[r.id], query.sort, query.origin, view === 'upcoming' ? (r) => r.day : undefined);
  const items = list.slice(offset, offset + limit);
  return { items, offset, total: list.length, ids: list.map((r) => r.id), details: withDetails(items, (r) => r.id) };
}
