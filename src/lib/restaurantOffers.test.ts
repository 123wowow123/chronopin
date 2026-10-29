import { describe, expect, it } from 'vitest';
import type { RestaurantSpecial } from './restaurantMenus';
import { restaurantMenuFor } from './restaurantMenus';
import { activeRestaurantOffer, deduplicateRestaurantOffers, nextRestaurantOffer, restaurantOfferSections, restaurantOffersToShow, offerEndLabel, type RestaurantOffer } from './restaurantOffers';

const zone = 'America/Los_Angeles';
const happyHour = restaurantMenuFor('https://www.maranellosd.com/')!.specials[0];
const active = (time: string, special = happyHour, timeZone = zone) => activeRestaurantOffer(special, new Date(time), timeZone);

describe('restaurant discounts available now', () => {
  it('uses local weekday and includes the start but excludes the end', () => {
    expect(active('2026-10-07T22:59:59Z')).toBeNull();
    expect(active('2026-10-07T23:00:00Z')).toEqual({ end: '18:00' });
    // UTC Thursday is still Wednesday evening in San Diego.
    expect(active('2026-10-08T00:59:59Z')).toEqual({ end: '18:00' });
    expect(active('2026-10-08T01:00:00Z')).toBeNull();
  });
  it('honors shorter Friday hours and excludes weekends', () => {
    expect(active('2026-10-10T00:29:59Z')).toEqual({ end: '17:30' });
    expect(active('2026-10-10T00:30:00Z')).toBeNull();
    expect(active('2026-10-10T23:00:00Z')).toBeNull();
    expect(active('2026-10-11T23:00:00Z')).toBeNull();
  });
  it('follows daylight saving offsets and each restaurant timezone', () => {
    expect(active('2026-12-09T23:30:00Z')).toBeNull();
    expect(active('2026-12-10T00:00:00Z')).toEqual({ end: '18:00' });
    expect(active('2026-10-07T21:00:00Z', happyHour, 'America/New_York')).toEqual({ end: '18:00' });
    expect(active('2026-10-07T21:00:00Z')).toBeNull();
  });
  it('does not advertise undated, non-discounted, or expired offers', () => {
    expect(active('2026-10-07T23:30:00Z', { ...happyHour, availability: undefined })).toBeNull();
    expect(active('2026-10-07T23:30:00Z', { ...happyHour, discounted: false })).toBeNull();
    expect(active('2026-10-07T23:30:00Z', { ...happyHour, validThrough: '2026-10-06' })).toBeNull();
    expect(active('2026-10-07T23:30:00Z', { ...happyHour, validFrom: '2026-10-08' })).toBeNull();
    expect(active('2026-10-07T23:30:00Z', { ...happyHour, validFrom: '2026-10-07', validThrough: '2026-10-07' })).not.toBeNull();
  });
  it('requires a holiday calendar and respects excluded dates', () => {
    const special = restaurantMenuFor('https://www.telefericbarcelona.com/lajolla')!.specials[0];
    expect(active('2026-10-07T23:30:00Z', special)).toBeNull();
    expect(active('2026-10-07T23:30:00Z', { ...special, availability: { ...special.availability!, excludedDates: [] } })).not.toBeNull();
    expect(active('2026-10-07T23:30:00Z', { ...special, availability: { ...special.availability!, excludedDates: ['2026-10-07'] } })).toBeNull();
  });
  it('carries a Friday overnight special into Saturday and ends at 2 am', () => {
    const special: RestaurantSpecial = { ...happyHour, availability: { windows: [{ days: [5], start: '22:00', end: '02:00' }] } };
    expect(active('2026-10-10T05:00:00Z', special)).not.toBeNull();
    expect(active('2026-10-10T08:00:00Z', special)).not.toBeNull();
    expect(active('2026-10-10T09:00:00Z', special)).toBeNull();
    expect(active('2026-10-11T08:00:00Z', special)).toBeNull();
    expect(active('2026-10-10T08:00:00Z', { ...special, availability: { ...special.availability!, excludedDates: ['2026-10-09'] } })).toBeNull();
  });
  it('supports daily all-day specials with explicit service hours and rejects malformed times', () => {
    const special = { ...happyHour, availability: { windows: [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00' }] } };
    expect(active('2026-10-11T23:00:00Z', special)).not.toBeNull();
    expect(active('2026-10-11T23:00:00Z', { ...special, availability: { windows: [{ days: [0], start: '25:00', end: '28:00' }] } })).toBeNull();
    expect(offerEndLabel('17:30')).toBe('5:30 pm');
    expect(offerEndLabel('24:00')).toBe('12 am');
  });
});

describe('next restaurant specials', () => {
  const offer = (name: string, score = 4.7, count = 500): RestaurantOffer => ({
    id: name, name, restaurantHref: `https://example.com/${name}`, neighborhood: 'Downtown', address: '', checkedAt: '2026-10-07', special: happyHour,
    review: { score, count, provider: 'OpenTable', sourceUrl: 'https://example.com/reviews', checkedAt: '2026-10-07' },
  });
  it('finds the next weekday start after service and across a weekend', () => {
    expect(nextRestaurantOffer(happyHour, new Date('2026-10-08T01:00:00Z'), zone)).toEqual({ startsAt: '2026-10-08T23:00:00.000Z', end: '18:00' });
    expect(nextRestaurantOffer(happyHour, new Date('2026-10-10T01:00:00Z'), zone)).toEqual({ startsAt: '2026-10-12T23:00:00.000Z', end: '18:00' });
  });
  it('uses the next local time across a DST change', () => {
    expect(nextRestaurantOffer(happyHour, new Date('2026-10-31T01:00:00Z'), zone)?.startsAt).toBe('2026-11-03T00:00:00.000Z');
  });
  it('skips excluded dates and expires at the last valid date', () => {
    const special = { ...happyHour, availability: { ...happyHour.availability!, excludedDates: ['2026-10-08'] } };
    expect(nextRestaurantOffer(special, new Date('2026-10-08T01:00:00Z'), zone)?.startsAt).toBe('2026-10-09T23:00:00.000Z');
    expect(nextRestaurantOffer({ ...special, validThrough: '2026-10-08' }, new Date('2026-10-08T01:00:00Z'), zone)).toBeNull();
    expect(nextRestaurantOffer({ ...special, validFrom: '2026-12-09' }, new Date('2026-10-08T01:00:00Z'), zone)?.startsAt).toBe('2026-12-10T00:00:00.000Z');
  });
  it('shows active specials instead of future recommendations', () => {
    const now = new Date('2026-10-07T23:30:00Z');
    const shown = restaurantOffersToShow([offer('New venue', 4.4, 46), offer('Favorite')], now, zone);
    expect(shown.upcoming).toBe(false);
    expect(shown.offers.map((offer) => offer.name)).toEqual(['Favorite', 'New venue']);
    expect(shown.offers.every((offer) => !offer.startsAt)).toBe(true);
  });
  it('keeps inactive specials visible in their own section while another offer is active', () => {
    const current = offer('Available');
    const later = { ...offer('Later'), special: { ...happyHour, availability: { windows: [{ days: [3], start: '18:00', end: '20:00' }] } } };
    const lowRated = { ...later, ...offer('Below threshold', 4.4), special: later.special };
    const sections = restaurantOfferSections([current, later, lowRated], new Date('2026-10-07T23:30:00Z'), zone);
    expect(sections.available.map((item) => item.id)).toEqual(['Available']);
    expect(sections.upcoming.map((item) => item.id)).toEqual(['Later', 'Below threshold']);
    expect(sections.upcoming[0].startsAt).toBe('2026-10-08T01:00:00.000Z');
  });
  it('puts lunch specials first, each group by rating, when sorted by lunch', () => {
    const lunch = { ...offer('Lunch place', 4.6, 120), special: { ...happyHour, kind: 'lunch' as const } };
    const now = new Date('2026-10-07T23:30:00Z');
    const shown = restaurantOfferSections([offer('Favorite', 4.9, 500), lunch, offer('Other', 4.7, 200)], now, zone, { sort: 'lunch' });
    expect(shown.available.map((item) => item.name)).toEqual(['Lunch place', 'Favorite', 'Other']);
  });
  it('puts the soonest start first, ties by rating, when sorted by start', () => {
    const at = (name: string, rating: number, start: string) => ({ ...offer(name, rating), special: { ...happyHour, availability: { windows: [{ days: [1, 2, 3, 4, 5], start, end: '22:00' }] } } });
    const now = new Date('2026-10-07T12:00:00Z');
    const offers = [at('Late favorite', 4.9, '20:00'), at('Early', 4.6, '15:00'), at('Mid', 4.7, '17:00'), at('Early better', 4.8, '15:00')];
    expect(restaurantOfferSections(offers, now, zone, { sort: 'rating' }).upcoming.map((item) => item.name)).toEqual(['Late favorite', 'Early better', 'Mid', 'Early']);
    expect(restaurantOfferSections(offers, now, zone, { sort: 'starts' }).upcoming.map((item) => item.name)).toEqual(['Early better', 'Early', 'Mid', 'Late favorite']);
  });
  it('moves an ended recurring offer to upcoming without repeating an active offer there', () => {
    const venue = offer('Favorite');
    const during = restaurantOfferSections([venue], new Date('2026-10-07T23:30:00Z'), zone);
    expect(during.available).toHaveLength(1);
    expect(during.upcoming).toEqual([]);
    const after = restaurantOfferSections([venue], new Date('2026-10-08T01:00:00Z'), zone);
    expect(after.available).toEqual([]);
    expect(after.upcoming[0].id).toBe(venue.id);
    expect(after.upcoming[0].startsAt).toBe('2026-10-08T23:00:00.000Z');
  });
  it('retains all distinct upcoming restaurants independently of the active section', () => {
    const current = offer('Available');
    const later = Array.from({ length: 105 }, (_, index) => ({ ...offer(`Later ${index}`), special: { ...happyHour, availability: { windows: [{ days: [3], start: '18:00', end: '20:00' }] } } }));
    const sections = restaurantOfferSections([current, ...later, ...later], new Date('2026-10-07T23:30:00Z'), zone, { sort: 'rating' });
    expect(sections.available).toHaveLength(1);
    expect(sections.upcoming).toHaveLength(later.length);
    expect(new Set(sections.upcoming.map((item) => item.restaurantHref)).size).toBe(later.length);
  });
  it('includes unrated and less-reviewed specials and ranks starts before ratings', () => {
    const earlier = { ...offer('Earlier', 4.6), special: { ...happyHour, availability: { windows: [{ days: [1, 2, 3, 4, 5], start: '15:30', end: '17:30' }] } } };
    const unrated = { ...offer('Unknown'), review: undefined };
    const shown = restaurantOffersToShow([offer('Lower', 4.4), offer('Too few', 4.9, 99), unrated, offer('Highest', 4.9), offer('Good', 4.6), earlier], new Date('2026-10-07T20:00:00Z'), zone);
    expect(shown.upcoming).toBe(true);
    expect(shown.offers.map((offer) => offer.name)).toEqual(['Earlier', 'Highest', 'Too few', 'Good', 'Lower', 'Unknown']);
  });
  it('shows only the nearest special per venue and excludes expired promotions', () => {
    const first = offer('Favorite');
    const later = { ...first, id: 'second', special: { ...happyHour, title: 'Weekend happy hour', availability: { windows: [{ days: [5], start: '18:00', end: '20:00' }] } } };
    const expired = { ...offer('Expired'), special: { ...happyHour, validThrough: '2026-10-06' } };
    const shown = restaurantOffersToShow([later, first, expired], new Date('2026-10-07T20:00:00Z'), zone);
    expect(shown.offers).toHaveLength(1);
    expect(shown.offers[0].id).toBe('Favorite');
    expect(shown.offers[0].offers?.map((item) => item.id)).toEqual(['Favorite', 'second']);
  });
  it('merges simultaneous specials into one restaurant card with their own schedules and end times', () => {
    const first = offer('Waterbar');
    const second = { ...first, id: 'tacos', special: { ...happyHour, title: 'Tacos & Tequila Tuesdays', kind: 'lunch' as const, availability: { windows: [{ days: [3], start: '15:00', end: '21:00' }] } } };
    const sections = restaurantOfferSections([first, second, second], new Date('2026-10-07T23:30:00Z'), zone);
    expect(sections.available).toHaveLength(1);
    expect(sections.available[0].offers?.map((item) => [item.id, item.end])).toEqual([['Waterbar', '18:00'], ['tacos', '21:00']]);
    expect(sections.upcoming).toEqual([]);
    expect(restaurantOfferSections([first, second], new Date('2026-10-07T23:30:00Z'), zone, { sort: 'lunch' }).available[0].id).toBe('tacos');
  });
  it('keeps a venue’s upcoming offers on its active card, excludes expired offers, and keeps branches separate', () => {
    const first = offer('Waterbar');
    const later = { ...first, id: 'later', special: { ...happyHour, title: 'Evening special', availability: { windows: [{ days: [3], start: '18:00', end: '21:00' }] } } };
    const expired = { ...first, id: 'expired', special: { ...happyHour, validThrough: '2026-10-06' } };
    const branch = { ...first, id: 'other-branch', restaurantHref: '/pin/other-branch' };
    const sections = restaurantOfferSections([later, expired, first, branch], new Date('2026-10-07T23:30:00Z'), zone);
    expect(sections.available).toHaveLength(2);
    expect(sections.upcoming).toEqual([]);
    expect(sections.available[0].offers?.map((item) => item.id)).toEqual(['Waterbar', 'later']);
    expect(sections.available[0].offers?.[1].startsAt).toBe('2026-10-08T01:00:00.000Z');
    expect(sections.available[1].offers?.map((item) => item.id)).toEqual(['other-branch']);
  });
  it('groups by branch identity when destination links differ or multiple branches share a website', () => {
    const first = { ...offer('Chain'), venueKey: 'mission-valley' };
    const second = { ...first, id: 'second', restaurantHref: '/pin/mission-valley', special: { ...happyHour, title: 'Taco Tuesday' } };
    const branch = { ...first, id: 'other-branch', venueKey: 'la-jolla' };
    const sections = restaurantOfferSections([first, second, branch], new Date('2026-10-07T23:30:00Z'), zone);
    expect(sections.available).toHaveLength(2);
    expect(sections.available[0].offers?.map((item) => item.id)).toEqual(['Chain', 'second']);
    expect(sections.available[1].offers?.map((item) => item.id)).toEqual(['other-branch']);
  });
  it('removes repeated Isola tabs even when their offer IDs differ', () => {
    const base = offer('Isola');
    const names = ['Happy hour', 'Takeout Tuesday', 'Happy hour', 'Takeout Tuesday', 'Wine Wednesday', 'Wine Wednesday'];
    const offers = names.map((title, index) => ({ ...base, id: `isola#${index}`, special: { ...happyHour, title } }));
    const shown = restaurantOfferSections(offers, new Date('2026-10-07T23:30:00Z'), zone);
    expect(shown.available).toHaveLength(1);
    expect(shown.available[0].offers?.map((item) => item.special.title)).toEqual(['Happy hour', 'Takeout Tuesday', 'Wine Wednesday']);
  });
  it('prefers the latest duplicate, then the more complete menu, while preserving other branches and dated campaigns', () => {
    const original = { ...offer('Isola'), special: { ...happyHour, title: 'Happy hour' } };
    const updated = { ...original, id: 'updated', checkedAt: '2026-10-12', special: { ...happyHour, title: '  HAPPY   HOUR  ' } };
    const detailed = { ...updated, id: 'menu', menu: { label: 'Happy hour', url: 'https://example.com/menu', coverage: 'published' as const, items: [{ name: 'Pizza', price: 10 }] } };
    const branch = { ...original, id: 'branch', restaurantHref: '/other-branch' };
    const dated = { ...original, id: 'dated', special: { ...happyHour, validFrom: '2026-12-01', validThrough: '2026-12-31' } };
    expect(deduplicateRestaurantOffers([original, updated, detailed, branch, dated]).map((item) => item.id)).toEqual(['menu', 'branch', 'dated']);
    expect(deduplicateRestaurantOffers([detailed, updated, original])[0].id).toBe('menu');
  });
  it('shows every distinct restaurant with the earliest specials first', () => {
    const venues = Array.from({ length: 105 }, (_, index) => offer(`Venue ${String(index).padStart(3, '0')}`));
    const shown = restaurantOffersToShow([...venues, ...venues], new Date('2026-10-07T20:00:00Z'), zone);
    expect(shown.offers).toHaveLength(venues.length);
    expect(new Set(shown.offers.map((item) => item.restaurantHref)).size).toBe(venues.length);
    expect(shown.offers.map((item) => item.name)).toEqual(venues.map((item) => item.name));
  });
  it.each(['2026-10-07T20:00:00Z', '2026-10-07T23:30:00Z'])('sorts current and upcoming specials by rating or distance at %s', (time) => {
    const origin = { latitude: 32.7, longitude: -117.1 };
    const nearby = { ...offer('Nearby', 4.6), location: origin };
    const highest = { ...offer('Highest', 4.9), location: { latitude: 32.8, longitude: -117.1 } };
    const unknown = offer('Unknown distance', 4.8);
    const invalid = { ...offer('Invalid coordinates', 4.7), location: { latitude: NaN, longitude: 0 } };
    const venues = [unknown, highest, invalid, nearby];
    expect(restaurantOffersToShow(venues, new Date(time), zone, { sort: 'rating' }).offers.map((item) => item.name)).toEqual(['Highest', 'Unknown distance', 'Invalid coordinates', 'Nearby']);
    expect(restaurantOffersToShow(venues, new Date(time), zone, { sort: 'distance', origin }).offers.map((item) => item.name)).toEqual(['Nearby', 'Highest', 'Unknown distance', 'Invalid coordinates']);
    expect(restaurantOffersToShow(venues, new Date(time), zone, { sort: 'distance' }).offers.map((item) => item.name)).toEqual(['Highest', 'Unknown distance', 'Invalid coordinates', 'Nearby']);
  });
  it('sorts all restaurants while keeping each venue’s earliest special', () => {
    const venues = Array.from({ length: 101 }, (_, index) => ({ ...offer(`Venue ${index}`, index === 100 ? 5 : 4.5), location: { latitude: 32.7 + (100 - index) / 100, longitude: -117.1 } }));
    const later = { ...venues[100], id: 'later', special: { ...happyHour, availability: { windows: [{ days: [5], start: '18:00', end: '20:00' }] } } };
    for (const sort of ['rating', 'distance'] as const) {
      const shown = restaurantOffersToShow([later, ...venues], new Date('2026-10-07T20:00:00Z'), zone, { sort, origin: venues[100].location });
      expect(shown.offers).toHaveLength(venues.length);
      expect(shown.offers[0].id).toBe('Venue 100');
      expect(new Set(shown.offers.map((item) => item.restaurantHref)).size).toBe(venues.length);
    }
  });
});
