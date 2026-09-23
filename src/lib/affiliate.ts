// Amazon Associates tracking id (affiliate-program.amazon.com). Added when a
// purchase link is shown rather than stored, so every Merchant row - old,
// scraped or hand-entered - earns without rewriting the data, and the price
// refresh script keeps fetching the plain listing.
export const amazonAssociateTag = 'chronopin04-20';

// The US store the tag is registered for. aws., press.aboutamazon.com and the
// other Amazon hosts are not shops, and other country stores need their own id.
const AMAZON_STORE_HOSTS = new Set(['amazon.com', 'www.amazon.com', 'smile.amazon.com', 'us.amazon.com']);

// The purchase link as it should be clicked: an amazon.com listing carries our
// tag (replacing anyone else's); anything else comes back untouched.
export function affiliateUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!AMAZON_STORE_HOSTS.has(parsed.hostname.toLowerCase())) {
    return url;
  }
  parsed.searchParams.set('tag', amazonAssociateTag);
  return parsed.toString();
}

export const isAmazonStoreUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  try {
    return AMAZON_STORE_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
};

// Stores we no longer link to. Their rows are gone from the seed data, but a
// database restored from before (production's, until it is cleaned) still has
// them, so the pin page skips them too.
const DROPPED_STORE_HOST = /(^|\.)bestbuy\.com$/i;

export const isPurchaseLinkShown = (url: string | undefined | null): url is string => {
  if (!url) return false;
  try {
    return !DROPPED_STORE_HOST.test(new URL(url).hostname);
  } catch {
    return true;
  }
};
