import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductAd from './productAd';
import * as db from '../db';
import { readAmazonListing } from '../listingPrice';

vi.mock('../db', () => ({ query: vi.fn() }));
vi.mock('../listingPrice', () => ({ readAmazonListing: vi.fn() }));

const listing = {
  title: 'Apple AirPods', brand: 'Apple', price: 179, rating: 4.4,
  reviewCount: 16062, available: true, image: 'https://m.media-amazon.com/images/I/product.jpg', urgency: null,
};
const row = { id: 1, url: 'https://www.amazon.com/dp/B0FQFB8FMG', categories: ['Audio'] };

beforeEach(() => vi.resetAllMocks());

describe('standalone product ads', () => {
  it('rejects a search link before reading or writing anything', async () => {
    expect(await ProductAd.add('https://www.amazon.com/s?k=airpods')).toHaveProperty('rejected');
    expect(readAmazonListing).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });

  it('requires the established review and stock thresholds', async () => {
    for (const override of [{ rating: 4.2 }, { reviewCount: 99 }, { available: false }, { brand: null }]) {
      vi.mocked(readAmazonListing).mockResolvedValue({ ...listing, ...override });
      expect(await ProductAd.add(row.url)).toHaveProperty('rejected');
    }
    expect(db.query).not.toHaveBeenCalled();
  });

  it('stores verified facts and strips third-party tracking', async () => {
    vi.mocked(readAmazonListing).mockResolvedValue(listing);
    vi.mocked(db.query).mockResolvedValue([row]);
    expect(await ProductAd.add(`${row.url}?tag=someone-20`, row.categories)).toEqual({ added: row });
    expect(readAmazonListing).toHaveBeenCalledWith(row.url);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT ("asin")'),
      ['B0FQFB8FMG', row.url, listing.title, 'Apple', 179, 4.4, 16062, listing.image, null, ['Audio']]);
  });

  it('allows the owner-selected Shark at 4.2 while retaining its other checks', async () => {
    const url = 'https://www.amazon.com/dp/B0B89P16MC';
    vi.mocked(db.query).mockResolvedValue([row]);
    vi.mocked(readAmazonListing).mockResolvedValue({ ...listing, brand: 'Shark', rating: 4.2 });
    expect(await ProductAd.add(url)).toHaveProperty('added');
    for (const override of [{ rating: 4.1 }, { reviewCount: 99 }, { available: false }, { brand: null }]) {
      vi.mocked(readAmazonListing).mockResolvedValue({ ...listing, rating: 4.2, ...override });
      expect(await ProductAd.add(url)).toHaveProperty('rejected');
    }
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('keeps existing facts when Amazon blocks a refresh', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([row]);
    vi.mocked(readAmazonListing).mockResolvedValue({ unknown: 'robot check' });
    expect(await ProductAd.check()).toMatchObject({ checked: 1, unread: 1, broken: [] });
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('stops serving products that have gone out of stock', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([row]).mockResolvedValue([]);
    vi.mocked(readAmazonListing).mockResolvedValue({ ...listing, available: false });
    expect(await ProductAd.check()).toMatchObject({ checked: 1, broken: [{ id: 1, problem: 'out of stock or no buy-box price' }] });
    expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining('"status" = \'broken\''), [1, 'out of stock or no buy-box price']);
  });
});
