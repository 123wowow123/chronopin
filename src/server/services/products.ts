// Data for the /products landing page (src/lib/products.ts), cached with
// Cache Components like src/server/services/topics.ts.

import { cacheLife, cacheTag } from 'next/cache';
import Pins from '../model/pins';
import Products, { type ProductBlurb } from '../model/products';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { PRODUCT_SHELVES, SHELF_SIZE, isKidsFriendlyProduct } from '@/lib/products';
import { toJson, type PinJson } from '@/lib/types';
import { TAGS } from './cache';
import { timelineMinConfidence } from './timeline';
import { localizePins } from './translations';

export type ProductPin = PinJson & { blurb?: string; rating?: ProductBlurb['rating']; kidsFriendly?: boolean };
export type ProductShelf = { name: string; label: string; pins: ProductPin[] };

// Each shelf with this year's pins, the shelves with none left out.
export async function productShelves(locale: Locale = DEFAULT_LOCALE): Promise<ProductShelf[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline, TAGS.sitemap);
  const minConfidence = await timelineMinConfidence();
  // A pin on two shelves (glasses are Electronics and Audio, an ice cream is
  // Ice Cream and Snack) stays on the first, and the later shelf fills its
  // places with other products instead of going short.
  const ids: number[][] = [];
  const taken: number[] = [];
  for (const shelf of PRODUCT_SHELVES) {
    const shelfIds = await Products.shelfIds(shelf.name, SHELF_SIZE, minConfidence, taken);
    ids.push(shelfIds);
    taken.push(...shelfIds);
  }
  const loaded = toJson<PinJson[]>((await Pins.queryByIds(ids.flat())).pins);
  await localizePins(loaded, locale);
  const blurbs = await Products.blurbs(loaded.map((p) => p.id));
  const byId = new Map(loaded.map((p) => [p.id, p]));
  const shelved = new Set<number>();
  return PRODUCT_SHELVES.map((shelf, i) => ({
    ...shelf,
    pins: ids[i].flatMap((id) => {
      const pin = byId.get(id);
      if (shelved.has(id)) return [];
      shelved.add(id);
      return pin ? [{ ...pin, blurb: blurbs.get(id)?.blurb, rating: blurbs.get(id)?.rating, kidsFriendly: isKidsFriendlyProduct(pin, shelf.name) }] : [];
    }),
  })).filter((shelf) => shelf.pins.length);
}
