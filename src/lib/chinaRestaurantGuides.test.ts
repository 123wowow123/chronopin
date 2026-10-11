import { describe, expect, it } from 'vitest';
import research from '../../docs/restaurant-china-guides.json';
import { parseRestaurantContent } from '@/server/restaurantContentValidation';
import { parseSpecialVenue } from '@/server/restaurantSpecialValidation';
import { activeRestaurantOffer, nextRestaurantOffer } from './restaurantOffers';
import type { RestaurantSpecial } from './restaurantMenus';

describe('China guide research', () => {
  it('validates API payloads and preserves branch identity and photo provenance', () => {
    expect(research.entries).toHaveLength(9);
    expect(new Set(research.entries.map((entry) => entry.pin.sourceUrl)).size).toBe(9);
    for (const entry of research.entries) {
      expect(() => parseRestaurantContent(entry.content)).not.toThrow();
      if ('special' in entry) expect(() => parseSpecialVenue(entry.special)).not.toThrow();
      expect(entry.content.profile.pinSourceUrl).toBe(entry.pin.sourceUrl);
      for (const photo of entry.photos) {
        expect(new URL(photo.url).hostname).toBe('chronopin.blob.core.windows.net');
        expect(photo.sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(photo.credit).toBeTruthy();
        expect(photo.sourcePage).toMatch(/^https:/);
      }
    }
  });
  it('keeps future dates estimated and known openings confirmed', () => {
    const openings = research.entries.filter((entry) => entry.content.profile.tile.kind === 'opening');
    expect(openings.filter((entry) => entry.pin.dateConfidence === 'confirmed')).toHaveLength(3);
    expect(openings.filter((entry) => entry.pin.dateConfidence === 'estimated')).toHaveLength(2);
  });
  it('excludes the whole holiday break, working Saturdays and unresolved later calendars', () => {
    const special = research.entries.find((entry) => entry.content.profile.tile.slug === 'tivano')!.special!.profile.specials[0] as RestaurantSpecial;
    for (const day of ['2026-10-01', '2026-10-05', '2026-10-07', '2026-10-10', '2027-01-04']) {
      expect(activeRestaurantOffer(special, new Date(day + 'T04:00:00Z'), 'Asia/Shanghai')).toBeNull();
    }
    expect(activeRestaurantOffer(special, new Date('2026-10-08T04:00:00Z'), 'Asia/Shanghai')).not.toBeNull();
    expect(nextRestaurantOffer(special, new Date('2026-10-10T00:00:00Z'), 'Asia/Shanghai')?.startsAt).toBe('2026-10-12T03:30:00.000Z');
    expect(nextRestaurantOffer(special, new Date('2027-01-04T00:00:00Z'), 'Asia/Shanghai')).toBeNull();
  });
  it('expires the Shanghai offer and distinguishes snacks from qualifying cocktails', () => {
    const special = research.entries.find((entry) => entry.content.profile.tile.slug === 'calypso')!.special!.profile.specials[0] as RestaurantSpecial;
    expect(activeRestaurantOffer(special, new Date('2026-10-10T07:00:00Z'), 'Asia/Shanghai')).not.toBeNull();
    expect(activeRestaurantOffer(special, new Date('2026-10-12T07:00:00Z'), 'Asia/Shanghai')).toBeNull();
    expect(nextRestaurantOffer(special, new Date('2026-10-12T00:00:00Z'), 'Asia/Shanghai')).toBeNull();
    expect(special.menuLabel).toBe('Sunset Social Club cocktails');
  });
});
