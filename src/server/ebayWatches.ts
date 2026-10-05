// A live pre-owned watch on eBay for each brand's ad tile (Ad kind 'watch',
// src/lib/ads.ts): its picture and price, so the tile shows a real watch
// rather than a coloured square. Browse API like ./ebay.ts, so it needs the
// same keys (config.ebay); without them, or when eBay fails or has nothing,
// the tile stays the brand's coloured one.
//
// The listing is the first of eBay's own best-match results for the brand's
// search in the Wristwatches category that is buy-it-now, in dollars, has a
// picture and costs enough to be a watch rather than a part (WATCH_MIN_USD).
// It is kept FEATURE_TTL: a listing sells, so the tile's link goes to the
// brand's search, not the one listing. Cached on globalThis per brand,
// shared by every viewer; a failure or an empty answer is cached as long as a
// good one, so a brand costs one call a while, never one per view.

import { appToken, hasKeys } from './ebay';
import config from './config';

const SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const WRISTWATCHES = '31387';
const FEATURE_TTL = 30 * 60 * 1000;
const TIMEOUT_MS = 8000;
const LIMIT = 25;
// Below this a "Rolex" is a bracelet link or a box, not a watch.
export const WATCH_MIN_USD = 300;

export type FeaturedWatch = { title: string; price: number; imageUrl: string };

type Summary = { title?: string; price?: { value?: string; currency?: string }; image?: { imageUrl?: string }; thumbnailImages?: { imageUrl?: string }[] };

// The first result that is a watch with a picture and a dollar price, or null.
export function featuredFrom(items: Summary[]): FeaturedWatch | null {
  for (const item of items) {
    const price = Number(item.price?.value);
    const imageUrl = item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl;
    if (item.title && imageUrl && /^https:\/\//.test(imageUrl) && item.price?.currency === 'USD' && price >= WATCH_MIN_USD) return { title: item.title, price, imageUrl };
  }
  return null;
}

const state = ((globalThis as any).__chronopinEbayWatches ??= { cache: new Map() }) as {
  cache: Map<string, { promise: Promise<FeaturedWatch | null>; expires: number }>;
};

// The brand's featured watch (`query` is the brand as eBay searches it), or
// null; never rejects.
export function featuredWatch(query: string): Promise<FeaturedWatch | null> {
  if (!hasKeys()) return Promise.resolve(null);
  const key = query.toLowerCase();
  const hit = state.cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;
  const promise = search(query).catch(() => null);
  state.cache.set(key, { promise, expires: Date.now() + FEATURE_TTL });
  return promise;
}

async function search(query: string): Promise<FeaturedWatch | null> {
  const params = new URLSearchParams({
    q: query,
    category_ids: WRISTWATCHES,
    limit: String(LIMIT),
    filter: 'buyingOptions:{FIXED_PRICE},priceCurrency:USD,deliveryCountry:US',
  });
  const headers: Record<string, string> = { Authorization: `Bearer ${await appToken()}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' };
  if (config.ebay.campaignID) headers['X-EBAY-C-ENDUSERCTX'] = `affiliateCampaignId=${config.ebay.campaignID}`;
  const res = await fetch(`${SEARCH_URL}?${params}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`eBay watch search ${res.status}`);
  return featuredFrom(((await res.json()) as { itemSummaries?: Summary[] }).itemSummaries ?? []);
}
