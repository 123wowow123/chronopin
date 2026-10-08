import { describe, expect, it } from 'vitest';
import type { RestaurantSpecial } from './restaurantMenus';
import { restaurantMenuFor } from './restaurantMenus';
import { activeRestaurantOffer, nextRestaurantOffer, restaurantOfferSections, restaurantOffersToShow, offerEndLabel, type RestaurantOffer } from './restaurantOffers';

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

describe('next highly reviewed restaurant specials', () => {
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
    expect(sections.upcoming.map((item) => item.id)).toEqual(['Later']);
    expect(sections.upcoming[0].startsAt).toBe('2026-10-08T01:00:00.000Z');
  });
  it('puts lunch specials first, each group by rating, when sorted by lunch', () => {
    const lunch = { ...offer('Lunch place', 4.6, 120), special: { ...happyHour, kind: 'lunch' as const } };
    const now = new Date('2026-10-07T23:30:00Z');
    const shown = restaurantOfferSections([offer('Favorite', 4.9, 500), lunch, offer('Other', 4.7, 200)], now, zone, { sort: 'lunch' });
    expect(shown.available.map((item) => item.name)).toEqual(['Lunch place', 'Favorite', 'Other']);
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
  it('caps and deduplicates upcoming restaurants independently of the active section', () => {
    const current = offer('Available');
    const later = Array.from({ length: 105 }, (_, index) => ({ ...offer(`Later ${index}`), special: { ...happyHour, availability: { windows: [{ days: [3], start: '18:00', end: '20:00' }] } } }));
    const sections = restaurantOfferSections([current, ...later, ...later], new Date('2026-10-07T23:30:00Z'), zone, { sort: 'rating' });
    expect(sections.available).toHaveLength(1);
    expect(sections.upcoming).toHaveLength(100);
    expect(new Set(sections.upcoming.map((item) => item.restaurantHref)).size).toBe(100);
  });
  it('requires high ratings with enough reviews and ranks starts before ratings', () => {
    const earlier = { ...offer('Earlier', 4.6), special: { ...happyHour, availability: { windows: [{ days: [1, 2, 3, 4, 5], start: '15:30', end: '17:30' }] } } };
    const unrated = { ...offer('Unknown'), review: undefined };
    const shown = restaurantOffersToShow([offer('Lower', 4.4), offer('Too few', 4.9, 99), unrated, offer('Highest', 4.9), offer('Good', 4.6), earlier], new Date('2026-10-07T20:00:00Z'), zone);
    expect(shown.upcoming).toBe(true);
    expect(shown.offers.map((offer) => offer.name)).toEqual(['Earlier', 'Highest', 'Good']);
  });
  it('shows only the nearest special per venue and excludes expired promotions', () => {
    const first = offer('Favorite');
    const later = { ...first, id: 'second', special: { ...happyHour, availability: { windows: [{ days: [5], start: '18:00', end: '20:00' }] } } };
    const expired = { ...offer('Expired'), special: { ...happyHour, validThrough: '2026-10-06' } };
    const shown = restaurantOffersToShow([later, first, expired], new Date('2026-10-07T20:00:00Z'), zone);
    expect(shown.offers).toHaveLength(1);
    expect(shown.offers[0].id).toBe('Favorite');
  });
  it('shows up to one hundred distinct restaurants with the earliest specials first', () => {
    const venues = Array.from({ length: 105 }, (_, index) => offer(`Venue ${String(index).padStart(3, '0')}`));
    const shown = restaurantOffersToShow([...venues, ...venues], new Date('2026-10-07T20:00:00Z'), zone);
    expect(shown.offers).toHaveLength(100);
    expect(new Set(shown.offers.map((item) => item.restaurantHref)).size).toBe(100);
    expect(shown.offers.map((item) => item.name)).toEqual(venues.slice(0, 100).map((item) => item.name));
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
  it('applies sorting before the one hundred-venue cap while keeping each venue’s earliest special', () => {
    const venues = Array.from({ length: 101 }, (_, index) => ({ ...offer(`Venue ${index}`, index === 100 ? 5 : 4.5), location: { latitude: 32.7 + (100 - index) / 100, longitude: -117.1 } }));
    const later = { ...venues[100], id: 'later', special: { ...happyHour, availability: { windows: [{ days: [5], start: '18:00', end: '20:00' }] } } };
    for (const sort of ['rating', 'distance'] as const) {
      const shown = restaurantOffersToShow([later, ...venues], new Date('2026-10-07T20:00:00Z'), zone, { sort, origin: venues[100].location });
      expect(shown.offers).toHaveLength(100);
      expect(shown.offers[0].id).toBe('Venue 100');
      expect(new Set(shown.offers.map((item) => item.restaurantHref)).size).toBe(100);
    }
  });
});
