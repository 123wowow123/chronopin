import { cacheLife, cacheTag } from 'next/cache';
import { dayKeyIn } from '@/lib/format';
import { GUIDE_PAGE_SIZE, type GuideItem, type GuidePage, type GuideQuery, type GuideSummary, type GuideView } from '@/lib/restaurantGuide';
import { arrangeRestaurantOfferSections, scheduleRestaurantOffers, type OfferSchedule, type RestaurantOffer } from '@/lib/restaurantOffers';
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
  cacheTag(TAGS.restaurantContent);
  const region = RESTAURANT_REGIONS.find((item) => item.slug === regionSlug)!;
  const [data, tops] = await Promise.all([regionalRestaurants(region.name), regionalTopRestaurants(region.slug)]);
  const today = dayKeyIn(new Date(), region.timeZone);
  const [offers, details] = await Promise.all([regionalRestaurantOffers(data.restaurants, tops, today, region.slug), restaurantGuideDetails(data.restaurants, tops)]);
  const active = data.restaurants.filter((restaurant) => openingGroup(restaurant, today));
  return {
    // Changes only when this cache entry is rebuilt, so it tells a memo below when the offers did.
    version: crypto.randomUUID(),
    today, tops, offers, details, previewSnapshot: data.previewSnapshot,
    upcoming: active.filter((restaurant) => openingGroup(restaurant, today) === 'upcoming').sort((a, b) => a.day.localeCompare(b.day)),
    recent: active.filter((restaurant) => openingGroup(restaurant, today) === 'new').sort((a, b) => b.day.localeCompare(a.day)),
  };
}

// The schedule of one region's offers for one minute. The page asks for it
// three times (counts, available, next) and the API once per scroll.
const schedules = new Map<string, OfferSchedule>();
function offerSchedule(regionSlug: string, version: string, offers: RestaurantOffer[], now: Date, timeZone: string): OfferSchedule {
  const minute = Math.floor(now.getTime() / 60_000);
  const key = `${regionSlug}|${version}|${minute}`;
  let schedule = schedules.get(key);
  if (!schedule) {
    // Entries from earlier minutes are never asked for again.
    for (const stale of schedules.keys()) if (!stale.endsWith(`|${minute}`)) schedules.delete(stale);
    schedule = scheduleRestaurantOffers(offers, now, timeZone);
    schedules.set(key, schedule);
  }
  return schedule;
}

export async function guideSummary(regionSlug: string, now: Date): Promise<(GuideSummary & { today: string; previewSnapshot: boolean }) | null> {
  const region = RESTAURANT_REGIONS.find((item) => item.slug === regionSlug);
  if (!region) return null;
  const { today, tops, offers, upcoming, recent, previewSnapshot, version } = await guideBase(region.slug);
  const sections = arrangeRestaurantOfferSections(offerSchedule(region.slug, version, offers, now, region.timeZone));
  const names = (list: { neighborhood: string }[]) => [...new Set(list.map((item) => item.neighborhood))].sort();
  const featured = recent.find((restaurant) => restaurant.id === 6434 && restaurant.image) ?? recent.find((restaurant) => restaurant.image && !restaurant.imageNote) ?? recent.find((restaurant) => restaurant.image) ?? upcoming.find((restaurant) => restaurant.image) ?? null;
  return {
    today, previewSnapshot, featured,
    featuredTop: featured ? null : tops.find((restaurant) => restaurant.image) ?? null,
    counts: { upcoming: upcoming.length, new: recent.length, top: tops.length, discounts: sections.available.length + sections.upcoming.length },
    neighborhoods: { upcoming: names(upcoming), new: names(recent), top: names(tops), discounts: names(offers) },
  };
}

// One page of one list, ordered and filtered the way the guide shows it.
export async function guidePage(query: GuideQuery, offset: number, now: Date, limit = GUIDE_PAGE_SIZE): Promise<GuidePage<GuideItem> | null> {
  const region = RESTAURANT_REGIONS.find((item) => item.slug === query.region);
  if (!region) return null;
  const { tops, offers, details, upcoming, recent, version } = await guideBase(region.slug);
  const matches = (item: { neighborhood: string }) => query.neighborhood === 'all' || item.neighborhood === query.neighborhood;
  const withDetails = (items: GuideItem[], idOf: (item: any) => number): GuidePage<GuideItem>['details'] => Object.fromEntries(items.flatMap((item) => (details[idOf(item)] ? [[idOf(item), details[idOf(item)]]] : [])));
  const view: GuideView = query.view;
  if (view === 'discounts') {
    const sections = arrangeRestaurantOfferSections(offerSchedule(region.slug, version, offers, now, region.timeZone), { sort: query.sort === 'distance' || query.sort === 'lunch' || query.sort === 'starts' ? query.sort : 'rating', origin: query.origin }, matches);
    const list = query.section === 'next' ? sections.upcoming : sections.available;
    const located = list.flatMap((offer) => offer.location && Number.isFinite(offer.location.latitude) && Math.abs(offer.location.latitude) <= 90 && Number.isFinite(offer.location.longitude) && Math.abs(offer.location.longitude) <= 180 ? [offer.location] : []);
    const bounds = located.length ? [Math.min(...located.map((place) => place.latitude)), Math.min(...located.map((place) => place.longitude)), Math.max(...located.map((place) => place.latitude)), Math.max(...located.map((place) => place.longitude))].join(',') : undefined;
    return { items: list.slice(offset, offset + limit), offset, total: list.length, ids: list.flatMap((offer) => (offer.offers ?? [offer]).map((item) => item.id)), bounds, details: {} };
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
