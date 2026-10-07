import { describe, expect, it } from 'vitest';
import BasePin from './basePin';

describe('BasePin author', () => {
  it('takes the author from a pin read back from its JSON (the seed backup)', () => {
    const pin = new BasePin({ id: 845, title: 'Pyramid', user: { id: 76, userName: '@BuildDesk', email: 'x@example.com' } });
    expect(pin.userId).toBe(76);
    // Only the public fields come along.
    expect(pin.toJSON().user).toEqual({ id: 76, userName: '@BuildDesk' });
  });

  it('prefers a userId column, as a database row has', () => {
    expect(new BasePin({ id: 1, userId: 5, user: { id: 9 } }).userId).toBe(5);
  });

  it('includes verified restaurant price ranges without borrowing another location’s range', () => {
    const sourceUrl = 'https://guide.michelin.com/us/en/new-york-state/new-york/restaurant/le-bernardin';
    expect(new BasePin({ id: 1, sourceUrl }).toJSON().restaurantPriceRange).toBe('$$$$');
    expect(new BasePin({ id: 2, sourceUrl: `${sourceUrl}/` }).toJSON().restaurantPriceRange).toBe('$$$$');
    expect(new BasePin({ id: 3, sourceUrl: `${sourceUrl}#another-location` }).toJSON()).not.toHaveProperty('restaurantPriceRange');
    expect(new BasePin({ id: 4, sourceUrl: 'https://example.com/' }).toJSON()).not.toHaveProperty('restaurantPriceRange');
  });
});
