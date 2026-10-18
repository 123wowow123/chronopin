import { describe, expect, it } from 'vitest';
import research from '../../docs/restaurant-china-next-cities.json';
import { parseRestaurantContent } from '@/server/restaurantContentValidation';
import { parseSpecialVenue } from '@/server/restaurantSpecialValidation';
import { activeRestaurantOffer, nextRestaurantOffer } from './restaurantOffers';
import type { RestaurantSpecial } from './restaurantMenus';
import { RESTAURANT_REGIONS } from './restaurants';
const entry = (slug: string) => research.entries.find(e => e.content.profile.tile.slug === slug)!;
const special = (slug: string) => entry(slug).content.profile.menu.specials[0] as RestaurantSpecial;
describe('next ten China restaurant cities', () => {
  it('validates all ten guides, branch menus and Azure gallery provenance', () => {
    expect(research.entries).toHaveLength(23);
    expect(new Set(research.entries.map(e => e.pin.sourceUrl)).size).toBe(23);
    expect(new Set(research.entries.map(e => e.content.profile.tile.regionSlug))).toEqual(new Set(research.regions));
    for (const e of research.entries) {
      expect(() => parseRestaurantContent(e.content)).not.toThrow();
      if ('special' in e) expect(() => parseSpecialVenue(e.special)).not.toThrow();
      expect(e.geocoding.addressType).not.toBe('Locality');
      for (const m of e.content.profile.menu.menus) {
        expect(m.currency).toBe('CNY');
        expect(m.items.length).toBeGreaterThan(0);
        for (const i of m.items) if (!('price' in i)) expect(i.priceLabel).toBe('Price not published');
      }
      for (const p of e.photos) {
        expect(new URL(p.url).hostname).toBe('chronopin.blob.core.windows.net');
        expect(p.sourcePage).toMatch(/^https:/);
        expect(p.credit).toBeTruthy();
        expect(p.sha256).toMatch(/^[a-f0-9]{64}$/);
      }
    }
    const china = RESTAURANT_REGIONS.filter(r => r.country === 'China');
    expect(china).toHaveLength(27);
    expect(china[0].slug).toBe('kunming');
    expect(china.map(r => r.longitude)).toEqual(china.map(r => r.longitude).sort((a,b) => a-b));
  });
  it('preserves different branch child ages and membership eligibility', () => {
    expect(special('hefei-cafe-wan').conditions!.join(' ')).toContain('under six');
    expect(special('hefei-cafe-wan').conditions!.join(' ')).toContain('does not publish a Circle membership requirement');
    expect(special('shenyang-cafe-liao').conditions!.join(' ')).toContain('under seven');
    expect(special('shenyang-cafe-liao').conditions!.join(' ')).toContain('does not explicitly limit');
    expect(special('xiamen-amoy').conditions!.join(' ')).toContain('walk-in');
    expect(special('harbin-coffee-garden').conditions!.join(' ')).not.toContain('walk-in');
    expect(special('jinan-cafe-spring').conditions!.join(' ')).not.toContain('walk-in');
  });
  it('schedules Hefei lunch and dinner only Friday through Sunday', () => {
    const s = special('hefei-cafe-wan');
    expect(activeRestaurantOffer(s,new Date('2026-10-12T04:00:00Z'),'Asia/Shanghai')).toBeNull();
    expect(nextRestaurantOffer(s,new Date('2026-10-12T04:00:00Z'),'Asia/Shanghai')?.startsAt).toBe('2026-10-12T22:15:00.000Z');
    expect(activeRestaurantOffer(s,new Date('2026-10-16T04:00:00Z'),'Asia/Shanghai')).not.toBeNull();
    expect(nextRestaurantOffer(s,new Date('2026-10-10T07:00:00Z'),'Asia/Shanghai')?.startsAt).toBe('2026-10-10T09:30:00.000Z');
  });
  it('expires the dated opening campaign and labels its date window separately from service hours', () => {
    const s = special('haidilao-qiyun');
    expect(s.validThrough).toBe('2026-10-20');
    expect(s.conditions!.join(' ')).toContain('not 24-hour restaurant opening');
    expect(activeRestaurantOffer(s,new Date('2026-10-20T15:59:00Z'),'Asia/Shanghai')).not.toBeNull();
    expect(activeRestaurantOffer(s,new Date('2026-10-20T16:00:00Z'),'Asia/Shanghai')).toBeNull();
    expect(nextRestaurantOffer(s,new Date('2026-10-20T16:00:00Z'),'Asia/Shanghai')).toBeNull();
    const valid = entry('haidilao-qiyun').special!;
    expect(() => parseSpecialVenue(valid)).not.toThrow();
    const invalid = structuredClone(valid); invalid.profile.specials[0].availability!.windows[0].start='24:00';
    expect(() => parseSpecialVenue(invalid)).toThrow('Invalid service times');
  });
  it('does not turn estimates, regular menus, expired launch gifts or another venue’s PDFs into offers', () => {
    const planned = entry('meng-ze-yuan-hefei');
    expect(planned.pin.dateConfidence).toBe('estimated');
    expect(planned.content.profile.tile.openingConfirmed).toBe(false);
    expect(planned.pin.dateConfidenceReasoning).toContain('not an announced restaurant opening day');
    for (const slug of ['kunming-suma-bar','molly-tea-shuncheng','song-shan-tea-house','chayan-baohe','yuxi-foshan']) expect(entry(slug).content.profile.menu.specials).toHaveLength(0);
    expect(entry('dalian-icafe').content.profile.menu.menus[0].note).toContain('in-room dining and Shang Palace PDFs are excluded');
    expect(entry('hamasushi-xicheng').content.profile.menu.menus[0].items[0]).toHaveProperty('priceLabel','Price not published');
  });
});
