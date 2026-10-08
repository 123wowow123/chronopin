import { describe, expect, it } from 'vitest';
import { RESTAURANT_REGIONS, type Restaurant } from '@/lib/restaurants';
import { distanceKm } from '@/lib/distance';
import { activeRestaurantOffer, restaurantOffersToShow } from '@/lib/restaurantOffers';
import { regionalRestaurantOffers } from './restaurantOffers';

const venue: Restaurant = {
  id: 1, title: 'Maranello opening', name: 'Maranello', sourceUrl: 'https://www.maranellosd.com/', description: '',
  confirmed: true, day: '2026-01-01', estimated: false, dateLabel: 'Jan 1', neighborhood: 'San Diego', cuisine: 'Italian',
  image: null, imageNote: null, address: 'Test address',
};

describe('regional restaurant offers', () => {
  it('attaches only discounted specials with known schedules to confirmed venues', () => {
    const offers = regionalRestaurantOffers([venue, venue, { ...venue, id: 2, sourceUrl: 'https://example.com/' }], [], '2026-10-07');
    expect(offers).toHaveLength(1);
    expect(offers[0].restaurantHref).toContain('/pin/1/');
    expect(offers[0].menu?.items.find((item) => item.name === 'Truffle Fries')?.price).toBe(8);
    // The bundled offer has no published hours, even though it appears on the menu.
    expect(offers[0].menu?.items.some((item) => item.name === 'Charcuterie board & Aperol Spritz carafe')).toBe(false);
    expect(regionalRestaurantOffers([{ ...venue, confirmed: false }], [], '2026-10-07')).toEqual([]);
    expect(regionalRestaurantOffers([{ ...venue, day: '2026-10-08' }], [], '2026-10-07')).toEqual([]);
  });
  it('excludes California public holidays for the La Jolla Social Hour', () => {
    const offers = regionalRestaurantOffers([{ ...venue, sourceUrl: 'https://www.telefericbarcelona.com/lajolla' }], [], '2026-11-26');
    expect(offers).toHaveLength(1);
    expect(offers[0].special.availability?.excludedDates).toContain('2026-11-26');
    expect(activeRestaurantOffer(offers[0].special, new Date('2026-11-27T00:00:00Z'), 'America/Los_Angeles')).toBeNull();
    expect(activeRestaurantOffer(offers[0].special, new Date('2026-11-25T00:00:00Z'), 'America/Los_Angeles')).not.toBeNull();
  });
  it('includes researched specials even when a city has no recent opening pins', () => {
    const offers = regionalRestaurantOffers([], [], '2026-10-07', 'san-diego');
    expect(new Set(offers.map((offer) => offer.name)).size).toBe(21);
    expect(offers.every((offer) => offer.photo?.src.startsWith('https://chronopin.blob.core.windows.net/thumb/restaurant-images/') && offer.photo.alt && offer.photo.sourceUrl)).toBe(true);
    expect(offers.every((offer) => offer.review!.score >= 4.5 && offer.review!.count >= 100)).toBe(true);
    expect(regionalRestaurantOffers([], [], '2026-10-07', 'san-antonio').map((offer) => offer.name)).toEqual(['Ladino', 'Fleming’s San Antonio']);
    expect(regionalRestaurantOffers([], [], '2026-10-07', 'paris')).toEqual([]);
  });
  it('provides highly rated upcoming specials and Azure photos for every US guide', () => {
    const now = new Date('2026-10-08T08:00:00Z');
    const cities = RESTAURANT_REGIONS.filter((region) => region.country === 'United States');
    expect(cities).toHaveLength(19);
    for (const city of cities) {
      const offers = regionalRestaurantOffers([], [], '2026-10-07', city.slug);
      const shown = restaurantOffersToShow(offers, now, city.timeZone);
      expect(shown.upcoming, city.slug).toBe(true);
      expect(shown.offers.length, city.slug).toBeGreaterThan(0);
      for (const offer of shown.offers) {
        expect(offer.review!.score).toBeGreaterThanOrEqual(4.5);
        expect(offer.review!.count).toBeGreaterThanOrEqual(100);
        // Address geocoding must not silently place a branch in another city.
        expect(distanceKm(city, offer.location!), offer.name).toBeLessThan(50);
        const photoUrl = new URL(offer.photo!.src);
        expect(photoUrl.origin).toBe('https://chronopin.blob.core.windows.net');
        expect(photoUrl.pathname).toMatch(/^\/thumb\/restaurant-images\/.+-[a-f0-9]{16}\.webp$/);
        expect(offer.startsAt! > now.toISOString()).toBe(true);
      }
    }
  });
  it('uses branch service hours and distinguishes weekend food from drinks', () => {
    const miami = regionalRestaurantOffers([], [], '2026-10-07', 'miami')[0];
    expect(activeRestaurantOffer(miami.special, new Date('2026-10-08T20:30:00Z'), 'America/New_York')).toBeNull();
    expect(activeRestaurantOffer(miami.special, new Date('2026-10-08T21:00:00Z'), 'America/New_York')).not.toBeNull();
    const orsay = regionalRestaurantOffers([], [], '2026-10-07', 'jacksonville')[0];
    expect(activeRestaurantOffer(orsay.special, new Date('2026-10-10T15:00:00Z'), 'America/New_York')).toBeNull();
    expect(activeRestaurantOffer(orsay.special, new Date('2026-10-10T20:00:00Z'), 'America/New_York')).not.toBeNull();
    const boston = regionalRestaurantOffers([], [], '2026-10-07', 'boston')[0];
    expect(activeRestaurantOffer(boston.special, new Date('2026-10-13T01:00:00Z'), 'America/New_York')).not.toBeNull();
    expect(activeRestaurantOffer(boston.special, new Date('2026-10-14T01:00:00Z'), 'America/New_York')).toBeNull();
  });
  it('enriches an existing venue without duplicating its standalone researched offers', () => {
    const sourceUrl = 'https://www.fortoaksd.com/';
    const offers = regionalRestaurantOffers([{ ...venue, sourceUrl }], [], '2026-10-07', 'san-diego');
    const fort = offers.filter((offer) => offer.name === venue.name);
    expect(fort).toHaveLength(2);
    expect(fort.every((offer) => offer.restaurantHref.startsWith('/pin/1/'))).toBe(true);
    expect(offers).toHaveLength(22);
  });
  it('provides twenty distinct highly rated next specials throughout the week in San Diego', () => {
    const offers = regionalRestaurantOffers([], [], '2026-10-07', 'san-diego');
    for (let day = 8; day <= 14; day++) {
      // 1 am local, after every published special ends.
      const now = new Date(`2026-10-${String(day).padStart(2, '0')}T08:00:00Z`);
      const shown = restaurantOffersToShow(offers, now, 'America/Los_Angeles');
      expect(shown.upcoming).toBe(true);
      expect(shown.offers).toHaveLength(20);
      expect(new Set(shown.offers.map((offer) => offer.restaurantHref)).size).toBe(20);
      expect(shown.offers.every((offer) => offer.startsAt! > now.toISOString())).toBe(true);
    }

  });
  it('respects late Monday happy hours and Cloak + Petal holiday exclusions', () => {
    const offers = regionalRestaurantOffers([], [], '2026-10-07', 'san-diego');
    const at = new Date('2026-10-13T04:15:00Z'); // Monday 9:15 pm
    const laMesa = offers.find((offer) => offer.name === 'Brigantine La Mesa')!;
    const pointLoma = offers.find((offer) => offer.name === 'Brigantine Point Loma')!;
    expect(activeRestaurantOffer(laMesa.special, at, 'America/Los_Angeles')).toEqual({ end: '21:30' });
    expect(activeRestaurantOffer(pointLoma.special, at, 'America/Los_Angeles')).toBeNull();
    const cloak = offers.find((offer) => offer.name === 'Cloak + Petal')!;
    expect(cloak.special.availability?.excludedDates).toContain('2026-11-26');
    expect(activeRestaurantOffer(cloak.special, new Date('2026-11-27T00:00:00Z'), 'America/Los_Angeles')).toBeNull();
  });
  it('preserves The Prado’s extended Wednesday service and excludes its closed Monday', () => {
    const prado = regionalRestaurantOffers([], [], '2026-10-07', 'san-diego').find((offer) => offer.name === 'The Prado at Balboa Park')!;
    expect(activeRestaurantOffer(prado.special, new Date('2026-10-08T02:00:00Z'), 'America/Los_Angeles')).toEqual({ end: '20:00' });
    expect(activeRestaurantOffer(prado.special, new Date('2026-10-09T02:00:00Z'), 'America/Los_Angeles')).toBeNull();
    expect(activeRestaurantOffer(prado.special, new Date('2026-10-13T00:00:00Z'), 'America/Los_Angeles')).toBeNull();
  });
});
