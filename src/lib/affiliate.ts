// Amazon Associates tracking id (affiliate-program.amazon.com). Added when a
// purchase link is shown rather than stored, so every Merchant row - old,
// scraped or hand-entered - earns without rewriting the data, and the price
// refresh script keeps fetching the plain listing.
export const amazonAssociateTag = 'chronopin04-20';

// The US store the tag is registered for. aws., press.aboutamazon.com and the
// other Amazon hosts are not shops, and other country stores need their own id.
const AMAZON_STORE_HOSTS = new Set(['amazon.com', 'www.amazon.com', 'smile.amazon.com', 'us.amazon.com']);

// A Prime Video title page ("primevideo.com/detail/0FCJEHY4FXTDVCLZ5NR9A0N42N",
// also under /region/na/ or a language prefix) is not a page the tag earns on,
// but amazon.com shows the same title for the same id at /gp/video/detail/,
// so the link is sent there. Undefined for any other URL.
const PRIME_VIDEO_TITLE = /\/(?:detail|dp)\/(?:[^/]+\/)?([A-Z0-9]{10,})(?:[/?#]|$)/i;

function primeVideoOnAmazon(parsed: URL): URL | undefined {
  const host = parsed.hostname.toLowerCase();
  if (host !== 'primevideo.com' && !host.endsWith('.primevideo.com')) return undefined;
  const id = parsed.pathname.match(PRIME_VIDEO_TITLE)?.[1];
  return id ? new URL(`https://www.amazon.com/gp/video/detail/${id}`) : undefined;
}

// The amazon.com page a link opens as it should be clicked, or undefined when
// it is not one: an amazon.com store link as it is, a Prime Video title page
// moved onto amazon.com.
function amazonStorePage(url: string | undefined | null): URL | undefined {
  if (!url) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  return AMAZON_STORE_HOSTS.has(parsed.hostname.toLowerCase()) ? parsed : primeVideoOnAmazon(parsed);
}

// The purchase link as it should be clicked: an amazon.com listing (or Prime
// Video title, moved to amazon.com) carries our tag, replacing anyone else's;
// anything else comes back untouched.
export function affiliateUrl(url: string): string {
  const page = amazonStorePage(url);
  if (!page) return url;
  page.searchParams.set('tag', amazonAssociateTag);
  return page.toString();
}

// Whether the link is shown tagged, so the page owes the Associates disclosure.
export const isAmazonStoreUrl = (url: string | undefined | null): boolean => !!amazonStorePage(url);

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
