import { describe, expect, it } from 'vitest';
import { restaurantSpecialMap } from './restaurantSpecialMap';

describe('restaurant specials on the main map', () => {
  const fortOak = 'https://www.fortoaksd.com/#0';
  it('plots exactly the selected curated restaurants without requiring database pins', () => {
    const pins = restaurantSpecialMap([fortOak, fortOak, 'https://unknown.example/#0']);
    expect(pins).toHaveLength(1);
    expect(pins[0]).toMatchObject({ title: 'Fort Oak', restaurantHref: 'https://www.fortoaksd.com/', categories: ['Food'] });
    expect(pins[0].latitude).toEqual(expect.any(Number));
    expect(pins[0].longitude).toEqual(expect.any(Number));
    expect(pins[0].specialLabel).toContain('Happy hour');
    expect(pins[0].media).toHaveLength(1);
  });
  it('never substitutes a broader list for empty or unknown selections', () => {
    expect(restaurantSpecialMap([])).toEqual([]);
    expect(restaurantSpecialMap(['https://www.fortoaksd.com/#999'])).toEqual([]);
  });
});
