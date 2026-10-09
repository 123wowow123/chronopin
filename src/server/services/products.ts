// Data for the /products landing page (src/lib/products.ts), cached with
// Cache Components like src/server/services/topics.ts.

import { cacheLife, cacheTag } from 'next/cache';
import Pins from '../model/pins';
import Products, { type ProductBlurb } from '../model/products';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { PRODUCT_SHELVES, SHELF_SIZE } from '@/lib/products';
import { toJson, type PinJson } from '@/lib/types';
import { TAGS } from './cache';
import { timelineMinConfidence } from './timeline';
import { localizePins } from './translations';

export type ProductPin = PinJson & { blurb?: string; rating?: ProductBlurb['rating'] };
export type ProductShelf = { name: string; label: string; pins: ProductPin[] };

// Each shelf with this year's pins, the shelves with none left out.
export async function productShelves(locale: Locale = DEFAULT_LOCALE): Promise<ProductShelf[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline, TAGS.sitemap);
  const minConfidence = await timelineMinConfidence();
  const ids = await Promise.all(PRODUCT_SHELVES.map((shelf) => Products.shelfIds(shelf.name, SHELF_SIZE, minConfidence)));
  const loaded = toJson<PinJson[]>((await Pins.queryByIds(ids.flat())).pins);
  await localizePins(loaded, locale);
  const blurbs = await Products.blurbs(loaded.map((p) => p.id));
  const byId = new Map(loaded.map((p) => [p.id, p]));
  // A pin on two shelves (glasses are Electronics and Audio) stays on the first.
  const shelved = new Set<number>();
  return PRODUCT_SHELVES.map((shelf, i) => ({
    ...shelf,
    pins: ids[i].flatMap((id) => {
      const pin = byId.get(id);
      if (shelved.has(id)) return [];
      shelved.add(id);
      return pin ? [{ ...pin, blurb: blurbs.get(id)?.blurb, rating: blurbs.get(id)?.rating }] : [];
    }),
  })).filter((shelf) => shelf.pins.length);
}
