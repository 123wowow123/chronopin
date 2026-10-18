import { describe, expect, it } from 'vitest';
import { featuredFrom, WATCH_MIN_USD } from './ebayWatches';

const item = (over: object) => ({ title: 'Rolex Submariner 124060', price: { value: '9800.00', currency: 'USD' }, image: { imageUrl: 'https://i.ebayimg.com/images/g/abc/s-l225.jpg' }, ...over });

describe('featuredFrom', () => {
  it('takes the first real watch with a picture, in dollars', () => {
    const cheap = item({ title: 'Rolex bracelet link', price: { value: '25.00', currency: 'USD' } });
    const noPicture = item({ image: undefined });
    const euros = item({ price: { value: '9000', currency: 'EUR' } });
    const good = item({ title: 'Rolex Datejust 41', price: { value: '8450.50', currency: 'USD' } });
    expect(featuredFrom([cheap, noPicture, euros, good, item({})])).toEqual({ title: 'Rolex Datejust 41', price: 8450.5, imageUrl: 'https://i.ebayimg.com/images/g/abc/s-l225.jpg' });
  });

  it('falls back to a thumbnail, refuses a plain-http picture, and says nothing when nothing fits', () => {
    expect(featuredFrom([item({ image: undefined, thumbnailImages: [{ imageUrl: 'https://i.ebayimg.com/t.jpg' }] })])?.imageUrl).toBe('https://i.ebayimg.com/t.jpg');
    expect(featuredFrom([item({ image: { imageUrl: 'http://i.ebayimg.com/x.jpg' } })])).toBeNull();
    expect(featuredFrom([item({ price: { value: String(WATCH_MIN_USD - 1), currency: 'USD' } })])).toBeNull();
    expect(featuredFrom([])).toBeNull();
  });
});
