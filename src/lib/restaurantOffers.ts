import { TZDate } from '@date-fns/tz';
import { distanceKm, type Place } from './distance';
import type { RestaurantMenu, RestaurantPhoto, RestaurantReview, RestaurantSpecial } from './restaurantMenus';

export function isRestaurantPromotion(special: RestaurantSpecial): boolean {
  return Boolean(special.discounted || (special.limitedTime && special.validFrom && special.validThrough));
}

export type RestaurantOffer = {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  restaurantHref: string;
  // Branch identity stays stable even when links change or branches share a website.
  venueKey?: string;
  checkedAt: string;
  special: RestaurantSpecial;
  menu?: RestaurantMenu;
  review?: RestaurantReview;
  photo?: RestaurantPhoto;
  location?: Place;
  kidsFriendly?: boolean;
};

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function minutes(value: string): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(value)) return NaN;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

// Building an Intl.DateTimeFormat is the slow part of scheduling an offer, and
// one guide build asks for it thousands of times, so keep one per zone.
const clocks = new Map<string, Intl.DateTimeFormat>();
function localClock(timeZone: string): Intl.DateTimeFormat {
  let clock = clocks.get(timeZone);
  if (!clock) {
    clock = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    clocks.set(timeZone, clock);
  }
  return clock;
}

// Never infer availability from prose such as "lunch only" or "daily special".
export function activeRestaurantOffer(special: RestaurantSpecial, now: Date, timeZone: string): { end: string } | null {
  if (!isRestaurantPromotion(special) || !special.availability?.windows.length || !Number.isFinite(now.getTime())) return null;
  const parts = localClock(timeZone).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)!.value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  if ((special.validFrom && today < special.validFrom) || (special.validThrough && today > special.validThrough)) return null;
  const weekday = weekdays.indexOf(part('weekday'));
  const time = Number(part('hour')) * 60 + Number(part('minute'));
  const previous = new Date(`${today}T00:00:00Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  for (const window of special.availability.windows) {
    const start = minutes(window.start);
    const end = minutes(window.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start === end || start === 1440) continue;
    const overnight = end < start;
    const afterMidnight = overnight && time < end;
    const offerDay = afterMidnight ? previous.toISOString().slice(0, 10) : today;
    const offerWeekday = afterMidnight ? (weekday + 6) % 7 : weekday;
    if (!window.days.includes(offerWeekday)) continue;
    if (special.validFrom && offerDay < special.validFrom) continue;
    if (special.availability.holidayCalendarThrough && offerDay > special.availability.holidayCalendarThrough) continue;
    if (special.availability.excludedDates?.includes(offerDay)) continue;
    // Holiday-restricted offers require a resolved calendar from the server.
    if (special.availability.excludesHolidays && !special.availability.excludedDates) continue;
    if (overnight ? (time >= start || time < end) : (time >= start && time < end)) return { end: window.end };
  }
  return null;
}

export function offerEndLabel(value: string): string {
  const hour = Number(value.split(':')[0]) % 24;
  const minute = value.split(':')[1];
  return `${hour % 12 || 12}${minute === '00' ? '' : `:${minute}`} ${hour < 12 ? 'am' : 'pm'}`;
}

export function nextRestaurantOffer(special: RestaurantSpecial, now: Date, timeZone: string): { startsAt: string; end: string } | null {
  if (!isRestaurantPromotion(special) || !special.availability?.windows.length || !Number.isFinite(now.getTime())) return null;
  // Construct local calendar dates so DST changes never shift a service hour.
  const local = new TZDate(now, timeZone);
  const day = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  const firstDay = special.validFrom ? new Date(`${special.validFrom}T00:00:00Z`) : day;
  if (firstDay > day) day.setTime(firstDay.getTime());
  for (let offset = 0; offset < 366; offset++) {
    const dayKey = day.toISOString().slice(0, 10);
    if (special.validThrough && dayKey > special.validThrough) return null;
    const candidates = special.availability.windows.flatMap((window) => {
      const start = minutes(window.start);
      if (!Number.isFinite(start) || start === 1440 || !window.days.includes(day.getUTCDay())) return [];
      const candidate = new TZDate(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), Math.floor(start / 60), start % 60, 0, 0, timeZone);
      if (candidate.getTime() <= now.getTime()) return [];
      const active = activeRestaurantOffer(special, candidate, timeZone);
      return active ? [{ startsAt: new Date(candidate.getTime()).toISOString(), end: active.end }] : [];
    }).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    if (candidates.length) return candidates[0];
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return null;
}

export type ScheduledRestaurantOffer = RestaurantOffer & { end: string; startsAt?: string; offers?: ScheduledRestaurantOffer[] };
export type RestaurantOfferSort = 'rating' | 'distance' | 'lunch' | 'starts';
export function restaurantOfferDistance(offer: RestaurantOffer, origin?: Place): number | undefined {
  const valid = (place?: Place) => !!place && Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90 && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180;
  return valid(origin) && valid(offer.location) ? distanceKm(origin!, offer.location!) : undefined;
}
export type OfferSchedule = { available: ScheduledRestaurantOffer[]; upcoming: ScheduledRestaurantOffer[] };

export function restaurantOfferVenueKey(offer: RestaurantOffer): string {
  return offer.venueKey ?? offer.restaurantHref;
}

// Imports can repeat the same promotion under different array indexes/IDs.
// Keep one tab per named promotion at a branch, with dated campaigns separate.
export function deduplicateRestaurantOffers<T extends RestaurantOffer>(offers: T[]): T[] {
  const unique = new Map<string, T>();
  const menuQuality = (offer: T) => {
    const menu = offer.menu;
    return (menu?.coverage === 'published' ? 3 : menu?.coverage === 'sample' ? 2 : 0) * 10_000 + (menu?.items.length ?? 0);
  };
  for (const offer of offers) {
    const special = offer.special;
    const title = special.title.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
    const key = JSON.stringify([restaurantOfferVenueKey(offer), title, special.kind, special.validFrom ?? '', special.validThrough ?? '']);
    const previous = unique.get(key);
    if (!previous || offer.checkedAt > previous.checkedAt || (offer.checkedAt === previous.checkedAt && menuQuality(offer) > menuQuality(previous))) unique.set(key, offer);
  }
  return [...unique.values()];
}

// Which offers are on now and when each inactive special next starts. This is the
// expensive part and does not depend on a sort or a neighborhood, so a caller
// can compute it once per minute and arrange it many ways.
export function scheduleRestaurantOffers(offers: RestaurantOffer[], now: Date, timeZone: string): OfferSchedule {
  const available = offers.flatMap((offer) => {
    const active = activeRestaurantOffer(offer.special, now, timeZone);
    return active ? [{ ...offer, ...active }] : [];
  });
  const activeIds = new Set(available.map((offer) => offer.id));
  const byReview = compareOffersByReview;
  const upcoming = offers.filter((offer) => !activeIds.has(offer.id)).flatMap((offer) => {
    const next = nextRestaurantOffer(offer.special, now, timeZone);
    return next ? [{ ...offer, ...next }] : [];
  }).sort((a, b) => a.startsAt.localeCompare(b.startsAt) || byReview(a, b));
  // Keep every eligible special so the guide can show them as tabs on a venue.
  return { available, upcoming };
}

const compareOffersByReview = (a: RestaurantOffer, b: RestaurantOffer) => (b.review?.score ?? 0) - (a.review?.score ?? 0) || (b.review?.count ?? 0) - (a.review?.count ?? 0) || a.name.localeCompare(b.name);

// Groups eligible offers into one card per restaurant before sorting and paging.
// `matches` narrows it to a neighborhood before the cap, so a filtered section
// still fills up. Active venues keep their future specials in the same card.
export function arrangeRestaurantOfferSections(schedule: OfferSchedule, options?: { sort: RestaurantOfferSort; origin?: Place }, matches?: (offer: RestaurantOffer) => boolean): OfferSchedule {
  const byReview = compareOffersByReview;
  const bySelectedSort = (a: RestaurantOffer, b: RestaurantOffer) => {
    // Lunch specials first, each group then by rating.
    if (options?.sort === 'lunch') {
      const difference = Number(b.special.kind === 'lunch') - Number(a.special.kind === 'lunch');
      if (difference) return difference;
    }
    if (options?.sort === 'distance' && options.origin) {
      const difference = (restaurantOfferDistance(a, options.origin) ?? Infinity) - (restaurantOfferDistance(b, options.origin) ?? Infinity);
      if (difference && !Number.isNaN(difference)) return difference;
    }
    return byReview(a, b);
  };
  const active = (matches ? schedule.available.filter(matches) : [...schedule.available]).sort(bySelectedSort);
  const next = matches ? schedule.upcoming.filter(matches) : [...schedule.upcoming];
  const venues = new Map<string, ScheduledRestaurantOffer[]>();
  for (const offer of [...active, ...next]) {
    const key = restaurantOfferVenueKey(offer);
    const offers = venues.get(key) ?? [];
    if (!offers.some((item) => item.id === offer.id)) offers.push(offer);
    venues.set(key, offers);
  }
  const available: ScheduledRestaurantOffer[] = [];
  const unique: ScheduledRestaurantOffer[] = [];
  for (const entries of venues.values()) {
    const offers = deduplicateRestaurantOffers(entries).sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));
    const card = { ...offers[0], offers };
    (card.startsAt ? unique : available).push(card);
  }
  // Choose each venue's earliest offer before applying the selected sort.
  // 'starts' is the soonest start first (the section was already built in that
  // order, ties by rating); only upcoming offers have a start to sort by.
  if (!options || options.sort === 'starts') unique.sort((a, b) => a.startsAt!.localeCompare(b.startsAt!) || byReview(a, b));
  else if (options) unique.sort(bySelectedSort);
  return { available: available.sort(bySelectedSort), upcoming: unique };
}

export function restaurantOfferSections(offers: RestaurantOffer[], now: Date, timeZone: string, options?: { sort: RestaurantOfferSort; origin?: Place }): { available: ScheduledRestaurantOffer[]; upcoming: ScheduledRestaurantOffer[] } {
  return arrangeRestaurantOfferSections(scheduleRestaurantOffers(offers, now, timeZone), options);
}

export function restaurantOffersToShow(offers: RestaurantOffer[], now: Date, timeZone: string, options?: { sort: RestaurantOfferSort; origin?: Place }): { upcoming: boolean; offers: ScheduledRestaurantOffer[] } {
  const sections = restaurantOfferSections(offers, now, timeZone, options);
  return sections.available.length ? { upcoming: false, offers: sections.available } : { upcoming: true, offers: sections.upcoming };
}
