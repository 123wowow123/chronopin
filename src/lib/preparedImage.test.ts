import { describe, expect, it } from 'vitest';
import { preparedName, preparedSources } from './preparedImage';

const blob = 'https://chronopin.blob.core.windows.net/thumb/';

describe('preparedSources', () => {
  it('points a restaurant photo at its Azure renditions', () => {
    const result = preparedSources(`${blob}restaurant-dishes/mume/dish.webp`)!;
    expect(result.src).toBe(`${blob}r/v1/640/restaurant-dishes/mume/dish.webp`);
    expect(result.srcSet).toBe(`${blob}r/v1/240/restaurant-dishes/mume/dish.webp 240w, ${blob}r/v1/640/restaurant-dishes/mume/dish.webp 640w, ${blob}r/v1/1280/restaurant-dishes/mume/dish.webp 1280w`);
  });

  it('keeps a non-WebP original name apart from a WebP one', () => {
    expect(preparedName('restaurant-images/a/b.jpeg', 240)).toBe('r/v1/240/restaurant-images/a/b.jpeg.webp');
    expect(preparedName('restaurant-images/a/b.webp', 240)).toBe('r/v1/240/restaurant-images/a/b.webp');
  });

  it('leaves pin thumbs, other folders and other hosts alone', () => {
    expect(preparedSources(`${blob}65d88065-5c15-4850-83f3-f8fca226e3da.jpeg`)).toBeNull();
    expect(preparedSources(`${blob}housing/x.webp`)).toBeNull();
    expect(preparedSources('https://images.squarespace-cdn.com/restaurant-dishes/x.webp')).toBeNull();
    expect(preparedSources(`${blob}restaurant-dishes/x.svg`)).toBeNull();
  });

  it('encodes each path segment once', () => {
    expect(preparedSources(`${blob}restaurant-dishes/caf%C3%A9/a%20b.webp`)!.src).toBe(`${blob}r/v1/640/restaurant-dishes/caf%C3%A9/a%20b.webp`);
  });
});
