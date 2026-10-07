import { describe, expect, it } from 'vitest';
import { restaurantPriceRange } from './restaurantPrice';
import prices from './data/restaurantPrices.json';
import { restaurantSourceKey } from '@/lib/restaurantMenus';

describe('restaurant price ranges', () => {
  it('resolves verified opening and established restaurant tiers', () => {
    for (const price of prices) {
      expect(restaurantPriceRange(price.pinSourceUrl)).toBe(price.priceRange);
    }
    expect(restaurantPriceRange('https://www.veritasrestaurant.com')).toBe('$$$$');
  });

  it('keeps roundup anchors and branches separate, allowing host and trailing-slash variations', () => {
    const opening = prices.find((price) => price.name === 'One Bryant Park')!;
    expect(restaurantPriceRange(opening.pinSourceUrl.replace('www.', ''))).toBe('$$$');
    expect(restaurantPriceRange(opening.pinSourceUrl.replace('#one-bryant-park', '#unverified-restaurant'))).toBeUndefined();
    expect(restaurantPriceRange('https://www.theinfatuation.com/new-york/reviews/veritas')).toBeUndefined();
    expect(restaurantPriceRange(null)).toBeUndefined();
    expect(restaurantPriceRange('')).toBeUndefined();
  });

  it('requires unique location keys and dated evidence for every backfilled tier', () => {
    expect(new Set(prices.map((price) => restaurantSourceKey(price.pinSourceUrl))).size).toBe(prices.length);
    for (const price of prices) {
      expect(price.priceRange).toMatch(/^\${1,4}$/);
      expect(new URL(price.sourceUrl).protocol).toBe('https:');
      expect(price.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(price.sourceLabel.length).toBeGreaterThan(0);
      expect(price.evidence.length).toBeGreaterThan(0);
    }
  });
});
