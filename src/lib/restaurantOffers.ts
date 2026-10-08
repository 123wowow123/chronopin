import { TZDate } from '@date-fns/tz';
import { distanceKm, type Place } from './distance';
import type { RestaurantMenu, RestaurantPhoto, RestaurantReview, RestaurantSpecial } from './restaurantMenus';

export type RestaurantOffer = {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  restaurantHref: string;
  checkedAt: string;
  special: RestaurantSpecial;
  menu?: RestaurantMenu;
  review?: RestaurantReview;
  photo?: RestaurantPhoto;
  location?: Place;
};

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function minutes(value: string): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(value)) return NaN;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

// Never infer availability from prose such as "lunch only" or "daily special".
export function activeRestaurantOffer(special: RestaurantSpecial, now: Date, timeZone: string): { end: string } | null {
  if (!special.discounted || !special.availability?.windows.length || !Number.isFinite(now.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
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
  if (!special.discounted || !special.availability?.windows.length || !Number.isFinite(now.getTime())) return null;
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

export const HIGH_REVIEW_SCORE = 4.5;
export const HIGH_REVIEW_COUNT = 100;
export const NEXT_SPECIALS_LIMIT = 50;
export function highlyReviewed(offer: RestaurantOffer): boolean {
  return !!offer.review && Number.isFinite(offer.review.score) && offer.review.score >= HIGH_REVIEW_SCORE && offer.review.score <= 5 && Number.isInteger(offer.review.count) && offer.review.count >= HIGH_REVIEW_COUNT;
}

export type ScheduledRestaurantOffer = RestaurantOffer & { end: string; startsAt?: string };
export type RestaurantOfferSort = 'rating' | 'distance';
export function restaurantOfferDistance(offer: RestaurantOffer, origin?: Place): number | undefined {
  const valid = (place?: Place) => !!place && Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90 && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180;
  return valid(origin) && valid(offer.location) ? distanceKm(origin!, offer.location!) : undefined;
}
export function restaurantOffersToShow(offers: RestaurantOffer[], now: Date, timeZone: string, options?: { sort: RestaurantOfferSort; origin?: Place }): { upcoming: boolean; offers: ScheduledRestaurantOffer[] } {
  const byReview = (a: RestaurantOffer, b: RestaurantOffer) => (b.review?.score ?? 0) - (a.review?.score ?? 0) || (b.review?.count ?? 0) - (a.review?.count ?? 0) || a.name.localeCompare(b.name);
  const bySelectedSort = (a: RestaurantOffer, b: RestaurantOffer) => {
    if (options?.sort === 'distance' && options.origin) {
      const difference = (restaurantOfferDistance(a, options.origin) ?? Infinity) - (restaurantOfferDistance(b, options.origin) ?? Infinity);
      if (difference && !Number.isNaN(difference)) return difference;
    }
    return byReview(a, b);
  };
  const available = offers.flatMap((offer) => {
    const active = activeRestaurantOffer(offer.special, now, timeZone);
    return active ? [{ ...offer, ...active }] : [];
  }).sort(bySelectedSort);
  if (available.length) return { upcoming: false, offers: available };
  const upcoming = offers.filter(highlyReviewed).flatMap((offer) => {
    const next = nextRestaurantOffer(offer.special, now, timeZone);
    return next ? [{ ...offer, ...next }] : [];
  }).sort((a, b) => a.startsAt.localeCompare(b.startsAt) || byReview(a, b));
  // Show each restaurant's nearest special once, rather than repeating venues.
  const seen = new Set<string>();
  const unique = upcoming.filter((offer) => {
    if (seen.has(offer.restaurantHref)) return false;
    seen.add(offer.restaurantHref);
    return true;
  });
  // Choose each venue's earliest offer before applying the selected sort and cap.
  if (options) unique.sort(bySelectedSort);
  return { upcoming: true, offers: unique.slice(0, NEXT_SPECIALS_LIMIT) };
}
