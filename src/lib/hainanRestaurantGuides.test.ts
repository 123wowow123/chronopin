import { describe, expect, it } from 'vitest';
import research from '../../docs/restaurant-hainan-guides.json';
import { parseRestaurantContent } from '@/server/restaurantContentValidation';
import { parseSpecialVenue } from '@/server/restaurantSpecialValidation';
import { activeRestaurantOffer, nextRestaurantOffer } from './restaurantOffers';
import type { RestaurantSpecial } from './restaurantMenus';

const entry = (slug: string) => research.entries.find(e => e.content.profile.tile.slug === slug)!;

describe('Hainan restaurant guides', () => {
  it('validates both cities and preserves branch menus and public gallery provenance', () => {
    expect(research.entries).toHaveLength(7);
    expect(new Set(research.entries.map(e => e.pin.sourceUrl)).size).toBe(7);
    expect(new Set(research.entries.map(e => e.content.profile.tile.regionSlug))).toEqual(new Set(['sanya', 'haikou']));
    expect(research.entries.flatMap(e => e.photos)).toHaveLength(13);
    for (const e of research.entries) {
      expect(() => parseRestaurantContent(e.content)).not.toThrow();
      if ('special' in e) expect(() => parseSpecialVenue(e.special)).not.toThrow();
      expect(e.geocoding.addressType).not.toBe('Locality');
      for (const menu of e.content.profile.menu.menus) {
        expect(menu.currency).toBe('CNY');
        expect(menu.items.length).toBeGreaterThan(0);
        for (const item of menu.items) if (!('price' in item)) expect(item.priceLabel).toBe('Price not published');
      }
      for (const photo of e.photos) {
        expect(new URL(photo.url).hostname).toBe('chronopin.blob.core.windows.net');
        expect(photo.sourcePage).toMatch(/^https:/);
        expect(photo.credit).toBeTruthy();
        expect(photo.sha256).toMatch(/^[a-f0-9]{64}$/);
      }
    }
  });
  it('keeps published price qualifications and excludes expired packages and signature cocktails from specials', () => {
    expect(entry('chuyi-wutai-sanya').content.profile.menu.menus[0].note).toContain('May 2022');
    expect(entry('yi-yang-sanya').content.profile.menu.menus[0].note).toContain('plus 15%');
    const reopening = entry('yu-yue-ge-sanya');
    expect(reopening.content.profile.menu.menus[0].items.every(i => !('price' in i))).toBe(true);
    expect(reopening.content.profile.menu.specials).toHaveLength(0);
    expect(entry('sunset-bar-sanya').content.profile.menu.specials).toHaveLength(0);
    expect(entry('flair-haikou').content.profile.menu.specials).toHaveLength(0);
  });
  it('preserves Sanya child eligibility and advertises the next meal outside service hours', () => {
    const special = entry('chuyi-wutai-sanya').special!.profile.specials[0] as RestaurantSpecial;
    expect(special.conditions!.join(' ')).toContain('paying adult');
    expect(special.conditions!.join(' ')).not.toContain('Circle member');
    expect(activeRestaurantOffer(special, new Date('2026-10-10T03:00:00Z'), 'Asia/Shanghai')).toBeNull();
    expect(nextRestaurantOffer(special, new Date('2026-10-10T03:00:00Z'), 'Asia/Shanghai')?.startsAt).toBe('2026-10-10T04:00:00.000Z');
    expect(activeRestaurantOffer(special, new Date('2026-10-10T04:00:00Z'), 'Asia/Shanghai')).not.toBeNull();
  });
});
