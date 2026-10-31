import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

type Matcher = {
  P: Record<string, never>;
  photoCaption: (business: string, alt: string) => string | null;
  match: (items: string[], photos: Record<string, string>) => Record<string, [string, string]>;
};
function matcher() {
  const window = { P: {} } as Matcher;
  // An empty queue exercises the real browser helpers without network calls.
  runInNewContext(readFileSync('scripts/restaurants/yelpDishes/matcher.browser.js', 'utf8'), { window, setTimeout });
  return window;
}

describe('Yelp dish-photo matching regressions', () => {
  it('reads captions after the entire business name, including branch suffixes', () => {
    expect(matcher().photoCaption('Lionfish Modern Coastal Cuisine - San Diego', 'Lionfish Modern Coastal Cuisine - San Diego - Bang Bang Shrimp - food')).toBe('Bang Bang Shrimp');
  });
  it('allows whitespace differences without accepting another branch', () => {
    const m = matcher();
    expect(m.photoCaption('IL Posto', 'IL  Posto - Aperol spritz - drink')).toBe('Aperol spritz');
    expect(m.photoCaption('Chef JUN - Bay Ho', 'Chef JUN - Point Loma - Edamame - food')).toBeNull();
  });
  it('does not turn a house salad into a shrimp-and-crab salad match', () => {
    const m = matcher();
    expect(m.match(['House salad'], { wrong: 'Shrimp and crab salad' })).toEqual({});
    expect(m.match(['House salad'], { right: 'House salad' })).toEqual({ 'House salad': ['right', 'House salad'] });
  });
});
