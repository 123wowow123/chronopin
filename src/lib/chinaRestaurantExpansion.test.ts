import { describe, expect, it } from 'vitest';
import research from '../../docs/restaurant-china-expansion.json';
import { parseRestaurantContent } from '@/server/restaurantContentValidation';
import { parseSpecialVenue } from '@/server/restaurantSpecialValidation';
import { activeRestaurantOffer, nextRestaurantOffer } from './restaurantOffers';
import type { RestaurantSpecial } from './restaurantMenus';

describe('China city expansion', () => {
  it('validates all six cities, branch menus and gallery provenance', () => {
    expect(research.entries).toHaveLength(14);
    expect(new Set(research.entries.map(e => e.pin.sourceUrl)).size).toBe(14);
    expect(new Set(research.entries.map(e => e.content.profile.tile.regionSlug)).size).toBe(6);
    expect(research.entries.flatMap(e => e.photos)).toHaveLength(38);
    for (const entry of research.entries) {
      expect(() => parseRestaurantContent(entry.content)).not.toThrow();
      if ('special' in entry) expect(() => parseSpecialVenue(entry.special)).not.toThrow();
      expect(entry.content.profile.pinSourceUrl).toBe(entry.pin.sourceUrl);
      expect(entry.geocoding.addressType).not.toBe('Locality');
      for (const photo of entry.photos) {
        expect(new URL(photo.url).hostname).toBe('chronopin.blob.core.windows.net');
        expect(photo.sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(photo.sourcePage).toMatch(/^https:/);
        expect(photo.credit).toBeTruthy();
      }
      for (const menu of entry.content.profile.menu.menus) {
        expect(menu.currency).toBe('CNY');
        for (const item of menu.items) if (!('price' in item)) expect(item.priceLabel).toBe('Price not published');
      }
    }
  });
  it('distinguishes confirmed openings, reopenings and the forthcoming month estimate', () => {
    const openings = research.entries.filter(e => e.content.profile.tile.kind === 'opening');
    expect(openings.filter(e => e.pin.dateConfidence === 'confirmed')).toHaveLength(6);
    const estimated = openings.filter(e => e.pin.dateConfidence === 'estimated');
    expect(estimated).toHaveLength(1);
    expect(estimated[0].pin.dateConfidenceReasoning).toContain('not a confirmed opening day');
    expect(research.entries.find(e => e.content.profile.tile.slug === 'shang-palace-wuhan')!.content.profile.menu.menus[0].note).toContain('May 2024');
  });
  it('keeps scheduled specials available outside hours and expires the dated offer', () => {
    const morton = research.entries.find(e => e.content.profile.tile.slug === 'mortons-grille')!.special!.profile.specials[0] as RestaurantSpecial;
    expect(activeRestaurantOffer(morton, new Date('2026-10-10T00:00:00Z'), 'Asia/Shanghai')).toBeNull();
    expect(nextRestaurantOffer(morton, new Date('2026-10-10T00:00:00Z'), 'Asia/Shanghai')?.startsAt).toBe('2026-10-10T08:00:00.000Z');
    expect(activeRestaurantOffer(morton, new Date('2026-10-10T09:00:00Z'), 'Asia/Shanghai')).not.toBeNull();
    expect(nextRestaurantOffer(morton, new Date('2027-01-01T00:00:00Z'), 'Asia/Shanghai')).toBeNull();
    const niccolo = research.entries.find(e => e.content.profile.tile.slug === 'niccolo-kitchen')!.special!.profile.specials[0] as RestaurantSpecial;
    expect(niccolo.conditions!.join(' ')).toContain('membership');
    expect(nextRestaurantOffer(niccolo, new Date('2026-10-10T00:00:00Z'), 'Asia/Shanghai')?.startsAt).toBe('2026-10-10T04:00:00.000Z');
  });
});
