// The cheapest exact eBay listing of a product, for the eBay button on a
// product pin (src/lib/shopping.ts). eBay refuses plain fetches of its pages,
// so this is its Browse API, with an application token from the client
// credentials grant. Keys in config.ebay; without them there is no answer and
// the button stays a search.
//
// Only new, buy-it-now listings count: an auction's current bid is not what
// the item costs, and a used one's price says little about the product. Of
// those, the title must be the product itself (isExactListing), not a case
// for it or an empty box.
//
// Shaped like src/server/weather.ts: an in-process cache on globalThis,
// shared by everyone looking at the same product. A listing sells, so the
// answer is kept an hour; no match is kept as long, so an unlisted product
// costs one call an hour, not one per view.

import { cheapestExact, type ShopMatch } from '@/lib/shopping';
import config from './config';

const TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const SCOPE = 'https://api.ebay.com/oauth/api_scope';
const TTL = 60 * 60 * 1000;
const CACHE_LIMIT = 2000;
const TIMEOUT_MS = 8000;
// Listings read per search: enough that the exact ones are among them.
const LIMIT = 50;
// New, and "new other" (new, but out of its box or without tags).
const NEW_CONDITIONS = '1000|1500';

type Token = { value: string; expires: number };

const state = ((globalThis as any).__chronopinEbay ??= {
  token: null,
  cache: new Map(),
}) as {
  token: Promise<Token> | null;
  cache: Map<string, { promise: Promise<ShopMatch | null>; expires: number }>;
};

export const hasKeys = () => !!(config.ebay.clientID && config.ebay.clientSecret);

// The product's cheapest exact listing, or null when eBay has none, or no
// keys are set. Rejects when eBay fails.
export function exactListing(product: string): Promise<ShopMatch | null> {
  const name = product.trim();
  if (!hasKeys() || !name) return Promise.resolve(null);
  const key = name.toLowerCase();
  const now = Date.now();
  const hit = state.cache.get(key);
  if (hit && hit.expires > now) return hit.promise;

  const promise = search(name);
  if (state.cache.size >= CACHE_LIMIT) {
    for (const [k, v] of state.cache) if (v.expires <= now) state.cache.delete(k);
    if (state.cache.size >= CACHE_LIMIT) state.cache.delete(state.cache.keys().next().value!);
  }
  state.cache.set(key, { promise, expires: now + TTL });
  // A failure is not an answer: the next view asks again.
  promise.catch(() => state.cache.delete(key));
  return promise;
}

type Summary = {
  title?: string;
  price?: { value?: string; currency?: string };
  itemWebUrl?: string;
  itemAffiliateWebUrl?: string;
};

async function search(product: string): Promise<ShopMatch | null> {
  const params = new URLSearchParams({
    q: product,
    limit: String(LIMIT),
    filter: `buyingOptions:{FIXED_PRICE},conditionIds:{${NEW_CONDITIONS}},priceCurrency:USD,deliveryCountry:US`,
  });
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await appToken()}`,
    'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
  };
  // With a Partner Network campaign, each listing comes with a link that
  // credits it.
  if (config.ebay.campaignID) headers['X-EBAY-C-ENDUSERCTX'] = `affiliateCampaignId=${config.ebay.campaignID}`;

  const res = await fetch(`${SEARCH_URL}?${params}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 401) state.token = null;
  if (!res.ok) throw new Error(`eBay search ${res.status}`);
  const data = (await res.json()) as { itemSummaries?: Summary[] };

  const listings = (data.itemSummaries ?? []).flatMap((item) => {
    const price = Number(item.price?.value);
    const url = item.itemAffiliateWebUrl || item.itemWebUrl;
    return item.title && url && price > 0 ? [{ title: item.title, price, currency: item.price?.currency || 'USD', url }] : [];
  });
  const best = cheapestExact(product, listings);
  return best ? { store: 'eBay', ...best } : null;
}

// An application token, fetched once and reused until a minute before it
// runs out (eBay's last two hours).
export function appToken(): Promise<string> {
  const current = state.token;
  if (current) {
    return current.then((t) => (t.expires > Date.now() ? t.value : ((state.token = null), appToken())));
  }
  const basic = Buffer.from(`${config.ebay.clientID}:${config.ebay.clientSecret}`).toString('base64');
  const next = fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: SCOPE }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`eBay token ${res.status}`);
    const body = (await res.json()) as { access_token: string; expires_in: number };
    return { value: body.access_token, expires: Date.now() + (body.expires_in - 60) * 1000 };
  });
  state.token = next;
  next.catch(() => {
    if (state.token === next) state.token = null;
  });
  return next.then((t) => t.value);
}
