// Where to buy what a pin is about. A pin about one purchasable product
// carries its name as a shop lists it (Pin.productName, 0085), and the pin
// page offers a button per store: an exact listing a curator or the scrape
// stored (a Merchant row) when there is one, otherwise a search of that store
// for the product. Search pages cannot go stale the way a resale listing
// does, and they cover every product pin without anyone finding listings.
//
// Every pin gets the general marketplaces; a vertical adds the stores its
// buyers use (StockX and GOAT for sneakers). Each search URL was checked to
// return results for a real product - don't add a store without doing so.
// Colours are each store's own brand colour with the text colour that reads
// on it, as the streaming buttons do (src/lib/streaming.ts). A black one
// also gets a brighter border, or it vanishes into the dark theme's page.

import { affiliateUrl, isAmazonStoreUrl, isEbayUrl, isPurchaseLinkShown } from './affiliate';
import { listingKindOf } from './listings';
import { streamingService } from './streaming';
import type { MerchantJson, PinJson } from './types';

type Store = {
  name: string;
  host: RegExp;
  search: (query: string) => string;
  background: string;
  text: string;
  border?: string;
  // ISO countries the store serves; absent = ships worldwide.
  countries?: string[];
};

const q = encodeURIComponent;

const STORES = {
  // No search here: a game's Steam page comes from a stored listing
  // (src/server/steamListing.ts), and a search of Steam would be no better
  // than the pin's own page.
  steam: {
    name: 'Steam',
    host: /(^|\.)steampowered\.com$/i,
    search: (s: string) => `https://store.steampowered.com/search/?term=${q(s)}`,
    background: '#1b2838',
    text: '#ffffff',
    border: '#66c0f4',
  },
  // No search here either: a film's tickets page comes from a stored listing
  // (src/server/movieListing.ts).
  fandango: {
    name: 'Fandango',
    countries: ['US'],
    host: /(^|\.)fandango\.com$/i,
    search: (s: string) => `https://www.fandango.com/search?q=${q(s)}&mode=general`,
    background: '#ff7300',
    text: '#000000',
  },
  amazon: {
    name: 'Amazon',
    host: /(^|\.)amazon\.com$/i,
    search: (s: string) => `https://www.amazon.com/s?k=${q(s)}`,
    background: '#ff9900',
    text: '#000000',
  },
  ebay: {
    name: 'eBay',
    host: /(^|\.)ebay\.com$/i,
    search: (s: string) => `https://www.ebay.com/sch/i.html?_nkw=${q(s)}`,
    background: '#3665f3',
    text: '#ffffff',
  },
  mercari: {
    name: 'Mercari',
    countries: ['US'],
    host: /(^|\.)mercari\.com$/i,
    search: (s: string) => `https://www.mercari.com/search/?keyword=${q(s)}`,
    background: '#5356ee',
    text: '#ffffff',
  },
  // Facebook moves the search to the viewer's own area.
  facebook: {
    name: 'Facebook',
    host: /(^|\.)facebook\.com$/i,
    search: (s: string) => `https://www.facebook.com/marketplace/search/?query=${q(s)}`,
    background: '#0866ff',
    text: '#ffffff',
  },
  stockx: {
    name: 'StockX',
    host: /(^|\.)stockx\.com$/i,
    search: (s: string) => `https://stockx.com/search?s=${q(s)}`,
    background: '#006340',
    text: '#ffffff',
  },
  goat: {
    name: 'GOAT',
    host: /(^|\.)goat\.com$/i,
    search: (s: string) => `https://www.goat.com/search?query=${q(s)}`,
    background: '#000000',
    text: '#ffffff',
    border: '#8a8a8a',
  },
  backmarket: {
    name: 'Back Market',
    countries: ['US'],
    host: /(^|\.)backmarket\.com$/i,
    search: (s: string) => `https://www.backmarket.com/en-us/search?q=${q(s)}`,
    background: '#000000',
    text: '#ffffff',
    border: '#8a8a8a',
  },
  swappa: {
    name: 'Swappa',
    countries: ['US'],
    host: /(^|\.)swappa\.com$/i,
    search: (s: string) => `https://swappa.com/search?q=${q(s)}`,
    background: '#1ba94c',
    text: '#ffffff',
  },
} satisfies Record<string, Store>;

type StoreId = keyof typeof STORES;

// A scale model, kit or toy is a product pin in Automotive, and it does sell
// on the marketplaces: it is not a car.
const MODEL_KIT = /\b(tamiya|mini 4wd|1\/\d{1,2}|1:\d{1,2}|diecast|die-cast|hot wheels|matchbox|lego|rc|kit|toy)\b/i;

const GENERAL: StoreId[] = ['amazon', 'ebay', 'mercari', 'facebook'];

// A vertical's own stores, shown ahead of the general ones: by one of the
// pin's tags or categories.
const SPECIALTY: { stores: StoreId[]; tags?: string[]; categories?: string[] }[] = [
  { stores: ['stockx', 'goat'], tags: ['Sneakers', 'Footwear'] },
  // Limited drops resell on StockX too: streetwear, designer toys and sealed
  // trading cards.
  { stores: ['stockx'], tags: ['Drops'] },
  { stores: ['backmarket', 'swappa'], categories: ['Electronics', 'Computing', 'Audio'] },
];

export type ShopLink = {
  store: string;
  url: string;
  // A listing's price; a search has none.
  price?: number;
  // A live listing's currency; a stored price is in dollars.
  currency?: string;
  // A search of the store rather than the product's own listing.
  search: boolean;
  // Carries our Amazon tag, so the page owes the Associates disclosure.
  amazon: boolean;
  // Carries our eBay Partner Network campaign, so the page says it earns from
  // eBay purchases. Only present on an eBay link.
  ebay?: boolean;
  // The store's brand colours; a listing on a store not listed here has none.
  background?: string;
  text?: string;
  border?: string;
  // ISO countries the link works in; absent = anywhere. The pin page shows
  // the viewer's own country's links and folds the rest behind a "…".
  countries?: string[];
};

// Country-code TLDs whose shops serve (essentially) that country only. A
// plain .com is treated as worldwide.
const CCTLD_COUNTRY: Record<string, string> = {
  uk: 'GB', de: 'DE', fr: 'FR', it: 'IT', es: 'ES', nl: 'NL', jp: 'JP', cn: 'CN', kr: 'KR', in: 'IN', au: 'AU', ca: 'CA',
  br: 'BR', mx: 'MX', se: 'SE', pl: 'PL', sg: 'SG', ae: 'AE', tr: 'TR', ie: 'IE', be: 'BE', at: 'AT', ch: 'CH', nz: 'NZ', za: 'ZA',
};

export function countryOfHost(url: string): string | undefined {
  try {
    const labels = new URL(url).hostname.toLowerCase().split('.');
    const tld = labels[labels.length - 1];
    if (labels.length > 1 && tld.length === 2) return CCTLD_COUNTRY[tld];
  } catch {}
  return undefined;
}

// Whether a link works for a viewer in this country. Unknown country or an
// unrestricted link: yes.
export const availableIn = (link: { countries?: string[] }, country: string | null) =>
  !link.countries || !country || link.countries.includes(country.toUpperCase());

// Ad and campaign parameters a pasted link picks up ("?utm_source=google&
// gclid=..."): they credit someone else's campaign and say nothing about the
// product, so a link is shown without them.
const TRACKING_PARAM = /^(utm_\w+|gclid|gbraid|wbraid|gad_\w+|fbclid|msclkid|dclid|yclid|mc_[ce]id|_ga|campaign_id|ad_id)$/i;

export function withoutTracking(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const tracked = [...parsed.searchParams.keys()].some((key) => TRACKING_PARAM.test(key));
  if (!tracked) return url;
  for (const key of [...parsed.searchParams.keys()]) if (TRACKING_PARAM.test(key)) parsed.searchParams.delete(key);
  return parsed.toString();
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

function storeOf(url: string): StoreId | undefined {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return undefined;
  }
  return (Object.keys(STORES) as StoreId[]).find((id) => STORES[id].host.test(host));
}

const isPurchase = (m: MerchantJson): m is MerchantJson & { url: string } => isPurchaseLinkShown(m.url) && !streamingService(m.url);

function storesFor(pin: Pick<PinJson, 'tags' | 'categories'>): StoreId[] {
  const tags = new Set((pin.tags ?? []).map((t) => t.name.toLowerCase()));
  const categories = new Set(pin.categories ?? []);
  const specialty = SPECIALTY.filter(
    (s) => s.tags?.some((t) => tags.has(t.toLowerCase())) || s.categories?.some((c) => categories.has(c)),
  ).flatMap((s) => s.stores);
  return [...new Set([...specialty, ...GENERAL])];
}

// A store's own listing of the product, found live (src/server/ebay.ts) for a
// store the pin only has a search of: its button goes to the listing and
// shows the price.
export type ShopMatch = { store: string; url: string; price: number; currency: string; title: string };

// Words a listing title shares with every product and so proves nothing by.
const FILLER = new Set(['a', 'an', 'and', 'the', 'of', 'x', 'with', 'edition']);
// A title with one of these sells something for the product, or only part of
// it: "Case for Pixel Watch 5", "Pixel Watch 5 box only", "for parts"; or a
// toy or scale model of it ("Xiaomi SU7 Ultra 1:24 diecast"), which carries
// every word of the product's name and costs a fraction of it.
const NOT_THE_PRODUCT =
  /\b(for|fits|compatible|replacement|case|cover|band|strap|charger|cable|protector|skin|sticker|decal|stand|mount|holder|adapter|box only|empty box|no box|parts|broken|repair|lot|bundle|toys?|diecast|die cast|miniatures?|replica|figures?|figurines?|rc|remote control|kids|children|hot wheels|matchbox|lego|plush)\b|\b1 (12|18|24|32|36|43|64)\b/;

// Trademark signs go first: NFKD spells ™ as "TM", which would fuse onto the
// word before it ("Kingdom™" -> "kingdomtm").
const words = (text: string) =>
  text
    .replace(/[\u2122\u00ae\u00a9\u2120]/g, ' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/(^|\s)\.|\.(\s|$)/g, ' ')
    .split(' ')
    .filter(Boolean);

// Whether a listing title is the product itself: it has every word of the
// product's name, and nothing marking it as an accessory, a part, a lot or an
// empty box. A title may add a size or a colour; it may not leave one out.
export function isExactListing(product: string, title: string): boolean {
  const wanted = words(product).filter((w) => !FILLER.has(w));
  if (!wanted.length) return false;
  const have = new Set(words(title));
  if (!wanted.every((w) => have.has(w))) return false;
  return !NOT_THE_PRODUCT.test(words(title).join(' ')) || NOT_THE_PRODUCT.test(words(product).join(' '));
}

// The cheapest of a search's exact listings, leaving out any priced under
// half the middle one: a knock-off or a mislabelled part that got past the
// title check is cheaper than the real thing, rarely dearer.
export function cheapestExact<T extends { title: string; price: number }>(product: string, listings: T[]): T | undefined {
  const exact = listings.filter((l) => l.price > 0 && isExactListing(product, l.title)).sort((a, b) => a.price - b.price);
  if (!exact.length) return undefined;
  const middle = exact[Math.floor(exact.length / 2)].price;
  return exact.find((l) => l.price >= middle / 2);
}

// The buttons with each live match in place of its store's search.
export function withMatches(links: ShopLink[], matches: ShopMatch[]): ShopLink[] {
  return links.map((link) => {
    const match = link.search && matches.find((m) => m.store === link.store);
    return match ? { ...link, url: affiliateUrl(match.url), price: match.price, currency: match.currency, search: false } : link;
  });
}

// A buy button click (0086) as the admin Clicks page shows it.
export type ShopClickRow = {
  id: number;
  at: string;
  pinId: number;
  title: string | null;
  thumbName?: string | null;
  originalUrl?: string | null;
  store: string;
  search: boolean;
  price: number | null;
  currency: string | null;
  userId: number | null;
  userName: string | null;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

// The pin's buy buttons, in order: its stored listings, then a search of
// every store it has no listing on. Links are ready to click: tracking
// stripped and Amazon's tag added (affiliateUrl).
export function shopLinks(pin: Pick<PinJson, 'productName' | 'merchants' | 'tags' | 'categories'>): ShopLink[] {
  const listed = (pin.merchants ?? []).filter(isPurchase);
  const covered = new Set(listed.map((m) => storeOf(m.url)).filter(Boolean));
  const links: ShopLink[] = listed.map((m) => {
    const url = withoutTracking(m.url);
    const id = storeOf(url);
    const store: Store | undefined = id && STORES[id];
    return {
      // A listing named for the edition it is (an Amazon link labelled "Vol. 2")
      // keeps its own name, so several listings from one store stay apart.
      store: store ? (id === 'amazon' && m.label && !/^amazon(\.com)?$/i.test(m.label.trim()) ? m.label : store.name) : m.label || hostOf(url),
      background: store?.background,
      text: store?.text,
      border: store?.border,
      url: affiliateUrl(url),
      price: m.price ?? undefined,
      countries: store?.countries ?? (countryOfHost(url) ? [countryOfHost(url)!] : undefined),
      search: false,
      amazon: isAmazonStoreUrl(url),
      ...(isEbayUrl(url) && { ebay: true }),
    };
  });
  const product = pin.productName?.trim();
  // A car is not sold from a marketplace search: the stores' results for its
  // name are toys, parts and other people's cars. A vehicle keeps its stored
  // listings (the maker's own page) and the readers' listings panel.
  if (product && !(listingKindOf(pin) === 'vehicle' && !MODEL_KIT.test(product))) {
    for (const id of storesFor(pin)) {
      if (covered.has(id)) continue;
      const store: Store = STORES[id];
      const url = store.search(product);
      links.push({
        store: store.name,
        url: affiliateUrl(url),
        countries: store.countries,
        search: true,
        amazon: isAmazonStoreUrl(url),
        ...(isEbayUrl(url) && { ebay: true }),
        background: store.background,
        text: store.text,
        border: store.border,
      });
    }
  }
  return links;
}
