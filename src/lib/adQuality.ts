// The bar a product has to clear to be advertised on a pin: well reviewed,
// from a brand, and in stock. Pure, so the job tools and the checks agree
// (src/server/model/pinAd.ts reads the listing; this judges it).

// Owner, 2026-10-02: "try to stick with high review and trusted brands".
export const MIN_AD_RATING = 4.3;
export const MIN_AD_REVIEWS = 100;

export type ListingFacts = {
  title: string;
  brand: string | null;
  price: number | null;
  rating: number | null;
  reviewCount: number | null;
  available: boolean;
};

// Why a listing may not be advertised, or null when it clears the bar.
export function adProblem(listing: ListingFacts): string | null {
  if (!listing.available || listing.price == null) return 'out of stock or no buy-box price';
  if (!listing.brand) return 'no brand on the listing';
  if (listing.rating == null || listing.reviewCount == null) return 'no reviews yet';
  if (listing.reviewCount < MIN_AD_REVIEWS) return `only ${listing.reviewCount} reviews (need ${MIN_AD_REVIEWS})`;
  if (listing.rating < MIN_AD_RATING) return `rated ${listing.rating} (need ${MIN_AD_RATING})`;
  return null;
}

// The ASIN of an amazon.com product link (/dp/, /gp/product/, /gp/aw/d/), or null.
export function asinOf(link: string): string | null {
  try {
    const url = new URL(link);
    if (!/(^|\.)amazon\.com$/i.test(url.hostname)) return null;
    return /\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/ASIN)\/([A-Z0-9]{10})(?:[/?]|$)/i.exec(url.pathname)?.[1].toUpperCase() ?? null;
  } catch {
    return null;
  }
}

export const listingUrl = (asin: string) => `https://www.amazon.com/dp/${asin}`;

const COMPANY_SUFFIX = /\b(inc|incorporated|corp|corporation|co|company|ltd|limited|llc|plc|gmbh|ag|sa|group|holdings|the)\b/g;
// A maker's own labels, so a listing sold under one counts as its parent's.
const BRAND_FAMILY: [RegExp, string][] = [[/^bandai\b/, 'bandai']];

const brandWords = (name: string) => {
  const words = rawBrandWords(name);
  const family = BRAND_FAMILY.find(([pattern]) => pattern.test(words.join(' ')));
  return family ? [family[1]] : words;
};

const rawBrandWords = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(COMPANY_SUFFIX, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

// Whether a listing's brand ("TAMIYA", "Visit the LEGO Store") and a pin's
// company ("Tamiya Inc.") are the same maker: equal once case, punctuation and
// corporate suffixes are gone, or one's words lead the other's ("Sony" and
// "Sony Interactive Entertainment").
export function sameBrand(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const [x, y] = [brandWords(a), brandWords(b)];
  if (!x.length || !y.length) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.every((word, i) => long[i] === word);
}
