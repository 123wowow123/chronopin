import { beforeEach, expect, it, vi } from 'vitest';
import PinAd from './pinAd';
import * as db from '../db';
import { readAmazonListing } from '../listingPrice';

vi.mock('../db', () => ({ query: vi.fn() }));
vi.mock('../listingPrice', () => ({ readAmazonListing: vi.fn() }));
vi.mock('./appSetting', () => ({ getAutoTranslate: async () => ({ enabled: false }) }));

const listing = {
  title: 'Swatch Big Bold Chrono', brand: 'Swatch', price: 180, rating: 4.7,
  reviewCount: 736, available: true, image: 'https://m.media-amazon.com/images/I/watch.jpg', urgency: null,
};

beforeEach(() => vi.resetAllMocks());

it('keeps the advertised product image when adding an ad to a pin', async () => {
  vi.mocked(readAmazonListing).mockResolvedValue(listing);
  vi.mocked(db.query).mockResolvedValueOnce([{ company: 'Swatch' }]).mockResolvedValueOnce([{ id: 19, image: listing.image }]);
  await PinAd.add(6334, 'https://www.amazon.com/dp/B0D35Y89T6');
  expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining('"image" = COALESCE(EXCLUDED."image"'),
    [6334, 'B0D35Y89T6', 'https://www.amazon.com/dp/B0D35Y89T6', listing.title, 'Swatch', 180, 4.7, 736, null, listing.image]);
});

it('refreshes the product image with the listing facts', async () => {
  vi.mocked(readAmazonListing).mockResolvedValue(listing);
  vi.mocked(db.query).mockResolvedValueOnce([{ id: 19, pinId: 6334, url: 'https://www.amazon.com/dp/B0D35Y89T6', status: 'ok' }]).mockResolvedValue([]);
  await PinAd.check();
  expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining('"image" = COALESCE($8, "image")'),
    [19, listing.title, 'Swatch', 180, 4.7, 736, null, listing.image]);
});
