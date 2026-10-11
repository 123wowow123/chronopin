import { describe, expect, it } from 'vitest';
import research from '../../docs/restaurant-china-large-cities.json';
import { parseRestaurantContent } from '@/server/restaurantContentValidation';
import { parseSpecialVenue } from '@/server/restaurantSpecialValidation';
import { activeRestaurantOffer, nextRestaurantOffer } from './restaurantOffers';
import type { RestaurantSpecial } from './restaurantMenus';

const entry = (slug: string) => research.entries.find(e => e.content.profile.tile.slug === slug)!;
const offer = (slug: string) => entry(slug).special!.profile.specials[0] as RestaurantSpecial;
const zone = 'Asia/Shanghai';

describe('China additional large cities', () => {
  it('validates six cities, thirteen branch profiles and all sourced gallery metadata', () => {
    expect(research.entries).toHaveLength(13);
    expect(new Set(research.entries.map(e => e.pin.sourceUrl)).size).toBe(13);
    expect(new Set(research.entries.map(e => e.content.profile.tile.regionSlug)).size).toBe(6);
    expect(research.entries.flatMap(e => e.photos)).toHaveLength(52);
    for (const e of research.entries) {
      expect(() => parseRestaurantContent(e.content)).not.toThrow();
      if ('special' in e) expect(() => parseSpecialVenue(e.special)).not.toThrow();
      expect(e.geocoding.addressType).not.toBe('Locality');
      expect(e.content.profile.pinSourceUrl).toBe(e.pin.sourceUrl);
      expect(e.content.profile.menu.menus.every(m => m.items.length > 0)).toBe(true);
      for (const m of e.content.profile.menu.menus) {
        expect(m.currency).toBe('CNY');
        for (const dish of m.items) if (!('price' in dish)) expect(dish.priceLabel).toBe('Price not published');
      }
      for (const photo of e.photos) {
        expect(new URL(photo.url).hostname).toBe('chronopin.blob.core.windows.net');
        expect(photo.sourcePage).toMatch(/^https:/);
        expect(photo.credit).toBeTruthy();
        expect(photo.sha256).toMatch(/^[a-f0-9]{64}$/);
      }
    }
  });
  it('uses confirmed opening days and avoids expired launch prices or other-branch menus', () => {
    const openings = research.entries.filter(e => e.content.profile.tile.kind === 'opening');
    expect(openings).toHaveLength(4);
    for (const e of openings) expect(e.pin.dateConfidence).toBe('confirmed');
    const sushi = entry('sushiro-yuefang');
    expect(sushi.content.profile.menu.menus[0].items.every(i => !('price' in i))).toBe(true);
    expect(sushi.content.profile.menu.specials).toHaveLength(0);
    const perch = (slug: string) => entry(slug).content.profile.menu.menus[0].items.find(i => i.name.startsWith('Roasted whole perch'));
    expect(perch('niccolo-changsha')).toMatchObject({ price: 248 });
    expect(perch('niccolo-suzhou')).toMatchObject({ price: 228 });
    expect(entry('jin-jing-ge').content.profile.menu.specials).toHaveLength(0);
  });
  it('shows the future seasonal menu without claiming a discount and expires it after November 28', () => {
    const seasonal = offer('cielo');
    expect(seasonal.discounted).toBe(false);
    expect(activeRestaurantOffer(seasonal, new Date('2026-10-10T12:00:00Z'), zone)).toBeNull();
    expect(nextRestaurantOffer(seasonal, new Date('2026-10-10T12:00:00Z'), zone)?.startsAt).toBe('2026-10-16T09:30:00.000Z');
    expect(activeRestaurantOffer(seasonal, new Date('2026-10-16T10:00:00Z'), zone)).not.toBeNull();
    expect(nextRestaurantOffer(seasonal, new Date('2026-11-29T00:00:00Z'), zone)).toBeNull();
    expect(nextRestaurantOffer({ ...seasonal, validThrough: undefined }, new Date('2026-10-10T12:00:00Z'), zone)).toBeNull();
    const profile = entry('cielo').special!;
    expect(() => parseSpecialVenue({ ...profile, profile: { ...profile.profile, specials: [{ ...seasonal, validThrough: undefined }] } })).toThrow('start and end dates');
    expect(() => parseSpecialVenue({ ...profile, profile: { ...profile.profile, specials: [{ ...seasonal, limitedTime: 'yes' }] } })).toThrow('limitedTime');
  });
  it('preserves branch membership limits, holiday exclusions and child eligibility', () => {
    expect(offer('niccolo-changsha').conditions!.join(' ')).toContain('12 people');
    expect(offer('niccolo-suzhou').conditions!.join(' ')).toContain('8 people');
    for (const slug of ['niccolo-changsha', 'niccolo-suzhou']) {
      expect(activeRestaurantOffer(offer(slug), new Date('2026-10-01T10:00:00Z'), zone)).toBeNull();
      expect(nextRestaurantOffer(offer(slug), new Date('2026-12-24T00:00:00Z'), zone)).toBeNull();
    }
    const child = offer('cafe-yum');
    expect(child.conditions!.join(' ')).toContain('registered hotel guests');
    expect(child.conditions!.join(' ')).toContain('paying Shangri-La Circle member');
    expect(nextRestaurantOffer(child, new Date('2026-10-10T00:00:00Z'), zone)?.startsAt).toBe('2026-10-10T03:30:00.000Z');
  });
});
