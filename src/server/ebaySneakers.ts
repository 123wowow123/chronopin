// Live sneaker pictures and prices for the eBay search ads. Like ebayWatches,
// an unavailable API leaves the model's plain tile and search link usable.
import { appToken, hasKeys } from './ebay';
import config from './config';

const SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const FEATURE_TTL = 30 * 60 * 1000;
const TIMEOUT_MS = 8000;

export type FeaturedSneaker = { title: string; price: number; imageUrl: string };
type Summary = { title?: string; price?: { value?: string; currency?: string }; image?: { imageUrl?: string }; thumbnailImages?: { imageUrl?: string }[] };

export function featuredFrom(items: Summary[]): FeaturedSneaker | null {
  for (const item of items) {
    const price = Number(item.price?.value);
    const imageUrl = item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl;
    // Avoid accessories mistakenly filed as shoes, without rejecting "new with box".
    if (!item.title || /\b(?:box only|empty box|laces|shoelaces|insoles|keychain|socks|poster)\b/i.test(item.title)) continue;
    if (imageUrl && /^https:\/\//.test(imageUrl) && item.price?.currency === 'USD' && Number.isFinite(price) && price >= 30) return { title: item.title, price, imageUrl };
  }
  return null;
}

const state = ((globalThis as any).__chronopinEbaySneakers ??= { cache: new Map() }) as {
  cache: Map<string, { promise: Promise<FeaturedSneaker | null>; expires: number }>;
};

export function featuredSneaker(query: string): Promise<FeaturedSneaker | null> {
  if (!hasKeys()) return Promise.resolve(null);
  const key = query.toLowerCase();
  const hit = state.cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;
  const promise = search(query).catch(() => null);
  state.cache.set(key, { promise, expires: Date.now() + FEATURE_TTL });
  return promise;
}

async function search(query: string): Promise<FeaturedSneaker | null> {
  const params = new URLSearchParams({
    q: query,
    category_ids: '15709', // eBay's athletic shoes category, also used by the ad links.
    limit: '25',
    filter: 'buyingOptions:{FIXED_PRICE},priceCurrency:USD,deliveryCountry:US',
  });
  const headers: Record<string, string> = { Authorization: `Bearer ${await appToken()}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' };
  if (config.ebay.campaignID) headers['X-EBAY-C-ENDUSERCTX'] = `affiliateCampaignId=${config.ebay.campaignID}`;
  const res = await fetch(`${SEARCH_URL}?${params}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`eBay sneaker search ${res.status}`);
  return featuredFrom(((await res.json()) as { itemSummaries?: Summary[] }).itemSummaries ?? []);
}
