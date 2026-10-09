import { describe, expect, it } from 'vitest';
import { restaurantMenuFor, restaurantMenuRescrapeCandidates, restaurantMenuState, type RestaurantMenuProfile } from './restaurantMenus';
import topPins from '@/server/data/sanDiegoTopRestaurants.preview.json';
import regionalCatalog from '@/server/data/regionalRestaurants.json';
import { RESTAURANT_REGIONS } from './restaurants';

describe('branch-specific restaurant menus and specials', () => {
  it('keeps Canadian menu sources specific to each restaurant and marks prices as CAD', () => {
    for (const restaurant of regionalCatalog.filter((row) => RESTAURANT_REGIONS.some((region) => region.country === 'Canada' && region.slug === row.regionSlug))) {
      const profile = restaurantMenuFor(restaurant.sourceUrl)!;
      expect(profile?.name, restaurant.sourceUrl).toBe(restaurant.name);
      expect(profile.menus[0].note).toContain('Canadian dollars');
    }
    const toronto = restaurantMenuFor('https://alorestaurant.com/')!;
    const victoria = restaurantMenuFor('https://www.marilenacafe.com/')!;
    const halifax = restaurantMenuFor('https://barkismet.com/')!;
    expect(toronto.name).toBe('Alo');
    expect(toronto.menus[0].note).toContain('Canadian dollars');
    expect(victoria.menus[0].documentUrl).toContain('Marilena_DinnerMenu_2Page_17JULY2026.pdf');
    expect(halifax.menus[0].documentUrl).toContain('/2026/09/CURRENT-MENU-192.pdf');
    expect(toronto.specials).toEqual([]);
    expect(victoria.specials).toEqual([]);
  });
  it('matches every new regional venue to its own menu profile, including roundup anchors', () => {
    for (const restaurant of regionalCatalog) {
      expect(restaurantMenuFor(restaurant.sourceUrl)?.name, restaurant.sourceUrl).toBe(restaurant.name);
    }
    expect(restaurantMenuFor('https://www.le-bernardin.com/menus')?.name).toBeUndefined();
    expect(restaurantMenuFor('https://www.holboxla.com/')?.name).toBeUndefined();
  });
  it('includes a published menu or document for every curated top restaurant pin', () => {
    for (const pin of topPins) {
      const profile = restaurantMenuFor(pin.sourceUrl);
      expect(profile, pin.title).toBeDefined();
      expect(profile!.menus.some((menu) => menu.items.length || menu.documentUrl), pin.title).toBe(true);
    }
    const soichi = restaurantMenuFor(topPins[2].sourceUrl)!;
    expect(soichi.menus[0].items.find((item) => item.name === 'Full Omakase (Dine in version)')?.price).toBe(189);
    expect(soichi.menus.find((menu) => menu.label === 'Sake')?.items.some((item) => item.name.endsWith('— 6oz'))).toBe(true);
    const sovereign = restaurantMenuFor(topPins[5].sourceUrl)!;
    expect(sovereign.menus[0].items.find((item) => item.name === 'Thai Tacos')?.price).toBe(14);
    expect(sovereign.menus[1].items.some((item) => item.name === 'Thai Tacos')).toBe(false);
    const lucien = restaurantMenuFor(topPins[1].sourceUrl)!;
    expect(lucien.menus[0].items[0].price).toBeUndefined();
    expect(lucien.menus[1].documentUrl).toContain('LUCIEN_WINELIST.pdf');
  });

  it('retains full menu categories, drink listings and variable prices', () => {
    const maranello = restaurantMenuFor('https://www.maranellosd.com/')!;
    expect(maranello.menus[0].items.some((item) => item.category === 'Sides')).toBe(true);
    expect(maranello.menus[0].items.some((item) => item.priceLabel === 'Market price')).toBe(true);
    expect(maranello.menus[1].items.some((item) => item.name === 'Peroni' && item.price === 8)).toBe(true);
    const zuma = restaurantMenuFor('https://www.zumarestaurant.com/en/san-diego')!;
    expect(zuma.menus[0].coverage).toBe('sample');
    expect(zuma.menus[0].items.find((item) => item.name === 'Sorbet & ice cream — individual scoop')?.price).toBe(6);
    for (const profile of restaurantMenuRescrapeCandidates('2026-11-06')) {
      for (const menu of profile.menus) {
        for (const item of menu.items) {
          expect(item.name.trim().length).toBeGreaterThan(0);
          if (item.price == null) expect(item.priceLabel?.length).toBeGreaterThan(0);
          else expect(Number.isFinite(item.price) && item.price >= 0).toBe(true);
        }
      }
    }
  });

  it('matches source URL variants without sharing offers with a different branch', () => {
    expect(restaurantMenuFor('https://maranellosd.com')?.menus.length).toBe(3);
    expect(restaurantMenuFor('https://www.telefericbarcelona.com/lajolla/')?.specials[0].title).toBe('The Social Hour');
    expect(restaurantMenuFor('https://www.telefericbarcelona.com/paloalto')).toBeUndefined();
    expect(restaurantMenuFor(null)).toBeUndefined();
  });

  it('keeps an upcoming venue empty and excludes the nonparticipating La Jolla lunch set', () => {
    expect(restaurantMenuFor('https://elpuntosd.com/')?.menus).toEqual([]);
    const laJolla = restaurantMenuFor('https://www.telefericbarcelona.com/lajolla')!;
    expect(laJolla.specials.some((special) => special.kind === 'lunch')).toBe(false);
    expect(laJolla.lunchNote?.text).toContain('not offered');
  });

  it('marks older records for re-scraping and retains their prices and offers', () => {
    const profile = restaurantMenuFor('https://www.maranellosd.com/')!;
    expect(restaurantMenuState(profile, '2026-11-05').rescrapeCandidate).toBe(false);
    expect(restaurantMenuState(profile, '2026-11-06')).toEqual({ rescrapeCandidate: true, specials: profile.specials });
    expect(restaurantMenuState(profile, '2027-10-06').specials).toEqual(profile.specials);
    expect(restaurantMenuRescrapeCandidates('2026-11-05')).toEqual([]);
    const candidate = restaurantMenuRescrapeCandidates('2026-11-06').find((record) => record.pinSourceUrl === profile.pinSourceUrl)!;
    expect(candidate.menus[0].items.find((item) => item.name === 'Gnocco Fritto')?.price).toBe(16);
    expect(candidate.specials).toEqual(profile.specials);
  });

  it('includes the last valid day, excludes expired offers and waits for the start date', () => {
    const profile: RestaurantMenuProfile = {
      pinSourceUrl: 'https://example.com', name: 'Example', checkedAt: '2026-10-06', menus: [],
      specials: [
        { kind: 'lunch', title: 'Ending today', description: '', sourceUrl: 'https://example.com', validThrough: '2026-10-06' },
        { kind: 'other', title: 'Expired', description: '', sourceUrl: 'https://example.com', validThrough: '2026-10-05' },
        { kind: 'other', title: 'Future', description: '', sourceUrl: 'https://example.com', validFrom: '2026-10-07' },
      ],
    };
    expect(restaurantMenuState(profile, '2026-10-06').specials.map((special) => special.title)).toEqual(['Ending today']);
    expect(restaurantMenuState(profile, '2026-10-07').specials.map((special) => special.title)).toEqual(['Future']);
  });
});
