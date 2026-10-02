// Reads a stored listing's current price from its store's own page, for the
// daily price refresh (services/listingPrices.ts) and `npm run merchants:prices`.
//
//   Amazon         the buy box of the variant the page shows, else its
//                  lowest new offer
//   Swappa         the model page's lowest listing (none left = unavailable)
//   Shopify shops  the product's own JSON (<product url>.js), in the shop's
//                  currency, which must be dollars (from /cart.js)
//   anything else  schema.org Offer markup in the page, in dollars
//
// A page that is blocked, unreadable or in another currency is "unknown", and
// the stored price is left alone. GameStop and Gap refuse or hide theirs.

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/json',
};
const TIMEOUT_MS = 20_000;

export type PriceRead = { kind: 'price'; price: number; title?: string } | { kind: 'unavailable'; title?: string } | { kind: 'unknown'; reason: string };

const decode = (text: string) =>
  text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim();

export function readAmazonPage(html: string): PriceRead {
  const title = decode(html.match(/id="productTitle"[^>]*>\s*([^<]*?)\s*</)?.[1] ?? '');
  // A robot check, or the "continue shopping" page Amazon sends a client it
  // distrusts: titled just "Amazon.com", a few KB, no product on it.
  if (!title && (/captcha|api-services-support@amazon\.com/i.test(html) || html.length < 20_000)) {
    return { kind: 'unknown', reason: 'robot check' };
  }
  // The buy box of the variant the page shows; other prices on the page belong
  // to related products.
  const buyBox = html.match(/twister-plus-buying-options-price-data">(\{.*?\})<\/div>/s)?.[1];
  if (buyBox) {
    try {
      const price = JSON.parse(buyBox).desktop_buybox_group_1?.[0]?.priceAmount;
      if (typeof price === 'number' && price > 0) return { kind: 'price', price, title };
    } catch {
      // Fall through to the availability check.
    }
  }
  // Some pages leave the buy box to a script and give only the link to every
  // offer, "New (3) from $399.99": the lowest new offer.
  const newFrom = html.match(/id="aod-ingress-link"[^>]*href="[^"]*condition=NEW[^"]*"[\s\S]{0,400}?class="a-offscreen">\$([\d,]+\.\d{2})</)?.[1];
  if (newFrom) return { kind: 'price', price: Number(newFrom.replace(/,/g, '')), title };
  // Every page carries "Currently unavailable" in a template, so only the
  // out-of-stock block or the availability line itself says so.
  const availability = html.match(/id="availability"[^>]*>([\s\S]{0,600}?)<\/div>/)?.[1]?.replace(/<style[\s\S]*?<\/style>|<[^>]+>/g, ' ') ?? '';
  if (/id="outOfStock"/.test(html) || /currently unavailable/i.test(availability)) return { kind: 'unavailable', title };
  return { kind: 'unknown', reason: title ? `no buy-box price (${title})` : 'no product on page' };
}

export function readSwappaPage(html: string): PriceRead {
  const title = decode(html.match(/<title>([^<]*)/)?.[1] ?? '').replace(/ - Used and Refurbished - Swappa$/, '');
  const offers = Number(html.match(/itemprop="offerCount" content="(\d+)"/)?.[1]);
  const low = Number(html.match(/itemprop="lowPrice" content="([\d.]+)"/)?.[1]);
  if (offers === 0) return { kind: 'unavailable', title };
  if (offers > 0 && low > 0) return { kind: 'price', price: low, title };
  return { kind: 'unknown', reason: 'no offer data on page' };
}

type Offer = { price?: unknown; lowPrice?: unknown; priceCurrency?: unknown; availability?: unknown };

// The first dollar Offer in the page's schema.org JSON-LD, or in its microdata.
export function readOfferMarkup(html: string): PriceRead {
  const title = decode(html.match(/<title>([^<]*)/)?.[1] ?? '');
  const offers: Offer[] = [];
  const collect = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(collect);
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    const type = String(record['@type'] ?? '');
    if (/^(Offer|AggregateOffer)$/.test(type)) offers.push(record as Offer);
    for (const key of ['offers', '@graph', 'mainEntity']) if (record[key]) collect(record[key]);
  };
  for (const [, body] of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collect(JSON.parse(body));
    } catch {
      // A page's broken block says nothing about its others.
    }
  }
  for (const offer of offers) {
    const price = Number(offer.price ?? offer.lowPrice);
    if (String(offer.priceCurrency ?? 'USD').toUpperCase() !== 'USD') continue;
    if (/OutOfStock|SoldOut|Discontinued/i.test(String(offer.availability ?? ''))) return { kind: 'unavailable', title };
    if (price > 0) return { kind: 'price', price, title };
  }
  const micro = html.match(/itemprop="price" content="([\d.]+)"/)?.[1];
  const currency = html.match(/itemprop="priceCurrency" content="([A-Z]{3})"/)?.[1] ?? 'USD';
  if (micro && Number(micro) > 0 && currency === 'USD') return { kind: 'price', price: Number(micro), title };
  return { kind: 'unknown', reason: offers.length ? 'offer not in dollars' : 'no offer markup' };
}

async function get(url: string): Promise<Response> {
  return fetch(url, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
}

// A shop's currency, once per shop per process.
const shopCurrency = new Map<string, Promise<string | null>>();
function currencyOf(origin: string): Promise<string | null> {
  let currency = shopCurrency.get(origin);
  if (!currency) {
    currency = get(`${origin}/cart.js`)
      .then(async (res) => (res.ok ? (((await res.json()) as { currency?: string }).currency ?? null) : null))
      .catch(() => null);
    shopCurrency.set(origin, currency);
  }
  return currency;
}

// A Shopify shop's product, from the JSON every Shopify product page has
// beside it. Null when the URL is not a Shopify product.
async function readShopify(url: URL): Promise<PriceRead | null> {
  const handle = url.pathname.match(/^(.*\/products\/[^/]+?)\/?$/)?.[1];
  if (!handle) return null;
  let res: Response;
  try {
    res = await get(`${url.origin}${handle}.js`);
  } catch {
    return null;
  }
  if (res.status === 404) return { kind: 'unavailable' };
  if (!res.ok || !/json/.test(res.headers.get('content-type') ?? '')) return null;
  const product = (await res.json()) as { title?: string; price?: number; available?: boolean };
  if (typeof product.price !== 'number') return null;
  const currency = await currencyOf(url.origin);
  if (currency !== 'USD') return { kind: 'unknown', reason: `shop prices in ${currency ?? 'an unknown currency'}` };
  if (product.available === false) return { kind: 'unavailable', title: product.title };
  return product.price > 0 ? { kind: 'price', price: product.price / 100, title: product.title } : { kind: 'unknown', reason: 'no price' };
}

// The store page behind a link: an affiliate deep link's own target.
export function storeUrlOf(link: string): URL | null {
  try {
    const url = new URL(link);
    if (/(^|\.)linksynergy\.com$/i.test(url.hostname) && url.searchParams.get('murl')) return new URL(url.searchParams.get('murl')!);
    return url;
  } catch {
    return null;
  }
}

// The listing's price now, read from its store.
export async function readListingPrice(link: string): Promise<PriceRead> {
  const url = storeUrlOf(link);
  if (!url) return { kind: 'unknown', reason: 'not a url' };
  try {
    const shopify = await readShopify(url);
    if (shopify) return shopify;
    const res = await get(url.toString());
    if (res.status === 404 || res.status === 410) return { kind: 'unavailable', title: `(${res.status})` };
    if (!res.ok) return { kind: 'unknown', reason: `HTTP ${res.status}` };
    const html = await res.text();
    if (/(^|\.)amazon\.com$/i.test(url.hostname)) return readAmazonPage(html);
    if (/(^|\.)swappa\.com$/i.test(url.hostname)) return readSwappaPage(html);
    return readOfferMarkup(html);
  } catch (err) {
    return { kind: 'unknown', reason: (err as Error).message };
  }
}

// What an Amazon product page says beyond its price, for the pin ads
// (src/server/model/pinAd.ts): brand, stars and how many reviews.
export type AmazonListing = {
  title: string;
  brand: string | null;
  price: number | null;
  rating: number | null;
  reviewCount: number | null;
  available: boolean;
};

export function readAmazonFacts(html: string): AmazonListing | { unknown: string } {
  const read = readAmazonPage(html);
  if (read.kind === 'unknown') return { unknown: read.reason };
  const title = read.title ?? '';
  const brand = decode(html.match(/<a[^>]*id="bylineInfo"[^>]*>\s*([^<]*?)\s*</)?.[1] ?? '')
    .replace(/^(Visit the |Brand:\s*)/i, '')
    .replace(/\s+Store$/i, '')
    .trim();
  const rating = Number(html.match(/id="acrPopover"[^>]*title="([\d.]+) out of 5 stars"/)?.[1]);
  const reviews = Number(html.match(/id="acrCustomerReviewText"[^>]*aria-label="([\d,]+) Reviews?"/i)?.[1]?.replace(/,/g, ''));
  return {
    title,
    brand: brand || null,
    price: read.kind === 'price' ? read.price : null,
    rating: rating > 0 ? rating : null,
    reviewCount: reviews >= 0 && Number.isFinite(reviews) && html.includes('acrCustomerReviewText') ? reviews : null,
    available: read.kind === 'price',
  };
}

// An amazon.com product's facts now: unknown when the page cannot be read
// (robot check, timeout), gone when Amazon says the listing does not exist.
// Amazon serves some requests a variant of the page with its price block
// left out, so an unreadable page is asked for again, a few seconds on.
const AMAZON_ATTEMPTS = 4;
const AMAZON_RETRY_MS = 3000;

export async function readAmazonListing(link: string): Promise<AmazonListing | { unknown: string } | { gone: true }> {
  let last: { unknown: string } = { unknown: 'not read' };
  for (let attempt = 0; attempt < AMAZON_ATTEMPTS; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, AMAZON_RETRY_MS));
    try {
      const res = await get(link);
      if (res.status === 404 || res.status === 410) return { gone: true };
      if (!res.ok) {
        last = { unknown: `HTTP ${res.status}` };
        continue;
      }
      const facts = readAmazonFacts(await res.text());
      if (!('unknown' in facts)) return facts;
      last = facts;
    } catch (err) {
      last = { unknown: (err as Error).message };
    }
  }
  return last;
}
