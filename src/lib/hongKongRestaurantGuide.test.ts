import { describe, expect, it } from 'vitest';
import research from '../../docs/restaurant-hong-kong-guide.json';
import { parseRestaurantContent } from '@/server/restaurantContentValidation';
import { parseSpecialVenue } from '@/server/restaurantSpecialValidation';
import { activeRestaurantOffer, nextRestaurantOffer } from './restaurantOffers';
import type { RestaurantSpecial } from './restaurantMenus';
import { RESTAURANT_REGIONS, RESTAURANT_COUNTRIES, nearestRestaurantRegion, openingDateLabel } from './restaurants';

describe('Hong Kong restaurant guide', () => {
  it('uses local time and geographic navigation ordering', () => {
    const region = RESTAURANT_REGIONS.find((city) => city.slug === 'hong-kong')!;
    expect(region.country).toBe('Hong Kong');
    expect(region.timeZone).toBe('Asia/Hong_Kong');
    expect(nearestRestaurantRegion(region).slug).toBe('hong-kong');
    const countryLongitudes = RESTAURANT_COUNTRIES.map((country) => Math.min(...RESTAURANT_REGIONS.filter((city) => city.country === country).map((city) => city.longitude)));
    expect(countryLongitudes).toEqual([...countryLongitudes].sort((a, b) => a - b));
  });
  it('validates all DB API payloads, branch identities and Azure gallery provenance', () => {
    expect(research.entries).toHaveLength(5);
    expect(new Set(research.entries.map((entry) => entry.pin.sourceUrl)).size).toBe(5);
    for (const entry of research.entries) {
      expect(() => parseRestaurantContent(entry.content)).not.toThrow();
      if (entry.special) expect(() => parseSpecialVenue(entry.special)).not.toThrow();
      expect(entry.content.profile.pinSourceUrl).toBe(entry.pin.sourceUrl);
      for (const menu of entry.content.profile.menu.menus) expect(menu.currency).toBe('HKD');
      expect(new Set(entry.photos.map((photo) => photo.sha256)).size).toBe(entry.photos.length);
      for (const photo of entry.photos) {
        expect(new URL(photo.url).hostname).toBe('chronopin.blob.core.windows.net');
        expect(photo.sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(photo.credit).toBeTruthy();
        expect(photo.sourcePage).toMatch(/^https:/);
      }
    }
  });
  it('distinguishes an unannounced future-branch menu and date from confirmed openings', () => {
    const future = research.entries.find((entry) => entry.content.profile.tile.slug === 'baker')!;
    expect(future.pin.dateConfidence).toBe('estimated');
    expect(future.content.profile.tile.openingConfirmed).toBe(false);
    expect(openingDateLabel(future.content.profile.tile.day!, true, future.pin.dateConfidenceReasoning)).toBe('Nov 2026');
    expect(future.content.profile.menu.menus[0].coverage).toBe('link');
    expect(future.content.profile.menu.menus[0].items).toHaveLength(0);
    expect(future.photos).toHaveLength(0);
    expect(research.entries.filter((entry) => entry.content.profile.tile.openingConfirmed)).toHaveLength(2);
  });
  it('keeps October promotions visible before service and expires them after October', () => {
    const bar = research.entries.find((entry) => entry.content.profile.tile.slug === 'bar41')!;
    const offers = bar.special!.profile.specials as RestaurantSpecial[];
    expect(offers).toHaveLength(3);
    const drinks = offers.find((offer) => offer.menuLabel === 'Happy-hour drinks')!;
    expect(activeRestaurantOffer(drinks, new Date('2026-10-10T01:00:00Z'), 'Asia/Hong_Kong')).toBeNull();
    expect(nextRestaurantOffer(drinks, new Date('2026-10-10T01:00:00Z'), 'Asia/Hong_Kong')?.startsAt).toBe('2026-10-10T09:30:00.000Z');
    expect(activeRestaurantOffer(drinks, new Date('2026-10-10T10:00:00Z'), 'Asia/Hong_Kong')).not.toBeNull();
    for (const offer of offers) {
      expect(nextRestaurantOffer(offer, new Date('2026-11-01T00:00:00Z'), 'Asia/Hong_Kong')).toBeNull();
      expect(bar.content.profile.menu.menus.some((menu) => menu.label === offer.menuLabel)).toBe(true);
    }
    expect(offers.find((offer) => offer.menuLabel === 'Afternoon tea')!.conditions!.join(' ')).toContain('original price');
  });
});
