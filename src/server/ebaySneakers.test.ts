import { describe, expect, it } from 'vitest';
import { featuredFrom } from './ebaySneakers';

const item = (over: object = {}) => ({ title: 'Nike Air Force 1 new with box', price: { value: '95.00', currency: 'USD' }, image: { imageUrl: 'https://i.ebayimg.com/shoe.jpg' }, ...over });

describe('featured sneaker', () => {
  it('skips accessories and unusable listings, keeping a real pair with its price and picture', () => {
    expect(featuredFrom([
      item({ title: 'Nike Air Force 1 box only' }),
      item({ title: 'Nike Air Force 1 shoelaces' }),
      item({ image: undefined }),
      item({ price: { value: '95', currency: 'EUR' } }),
      item({ price: { value: 'Infinity', currency: 'USD' } }),
      item({ price: { value: '5', currency: 'USD' } }),
      item(),
    ])).toEqual({ title: 'Nike Air Force 1 new with box', price: 95, imageUrl: 'https://i.ebayimg.com/shoe.jpg' });
  });

  it('supports thumbnails and falls back to a plain search tile when no listing qualifies', () => {
    expect(featuredFrom([item({ image: undefined, thumbnailImages: [{ imageUrl: 'https://i.ebayimg.com/thumb.jpg' }] })])?.imageUrl).toBe('https://i.ebayimg.com/thumb.jpg');
    expect(featuredFrom([item({ image: { imageUrl: 'http://i.ebayimg.com/shoe.jpg' } })])).toBeNull();
    expect(featuredFrom([])).toBeNull();
  });
});
