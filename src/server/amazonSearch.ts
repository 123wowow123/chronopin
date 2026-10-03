// Amazon.com's search results, read for the holiday ads
// (src/server/model/holidayAd.ts): what a search for "mooncake" lists, with the
// stars and review counts the page shows beside each. Only a shortlist - an ad
// is added after its own listing page is read (listingPrice.ts), which is where
// the real price, brand and stock come from.

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  // Search is refused (503, a robot page) unless the request looks like a
  // browser's navigation, all of these headers.
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
};
const TIMEOUT_MS = 20_000;

const decodeEntities = (text: string) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

export type SearchHit = {
  asin: string;
  title: string;
  price: number | null;
  rating: number | null;
  reviews: number | null;
  sponsored: boolean;
};

// The result cards of a search page, in the order Amazon lists them.
export function readSearchPage(html: string): SearchHit[] {
  const cards = html.split(/(?=<div[^>]+data-component-type="s-search-result")/).slice(1);
  const hits: SearchHit[] = [];
  for (const card of cards) {
    const asin = card.match(/data-asin="([A-Z0-9]{10})"/)?.[1];
    const title = card.match(/<h2[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/)?.[1];
    if (!asin || !title) continue;
    const price = card.match(/class="a-price"[^>]*>\s*<span class="a-offscreen">\$([\d,]+(?:\.\d{2})?)</)?.[1];
    const rating = card.match(/([\d.]+) out of 5 stars/)?.[1];
    const reviews = card.match(/aria-label="([\d,.]+[KkMm]?) ratings?"/)?.[1];
    hits.push({
      asin,
      title: decodeEntities(title.replace(/<[^>]+>/g, '')).trim(),
      price: price ? Number(price.replace(/,/g, '')) : null,
      rating: rating ? Number(rating) : null,
      reviews: reviews ? countOf(reviews) : null,
      sponsored: /AdHolder|puis-sponsored-label|>Sponsored</.test(card),
    });
  }
  return hits;
}

// "1,234" -> 1234; "2.5K" -> 2500.
function countOf(text: string): number {
  const match = /^([\d,.]+)([KkMm]?)$/.exec(text);
  if (!match) return 0;
  const n = Number(match[1].replace(/,/g, ''));
  return Math.round(match[2] ? n * (match[2].toLowerCase() === 'k' ? 1000 : 1_000_000) : n);
}

// A search of amazon.com. Amazon now and then answers a search with a stub
// page or drops the connection, so it is asked again a few seconds on;
// `unknown` once it still will not answer.
const ATTEMPTS = 3;
const RETRY_MS = 4000;

export async function searchAmazon(query: string): Promise<SearchHit[] | { unknown: string }> {
  let last = 'not read';
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
    try {
      const res = await fetch(`https://www.amazon.com/s?k=${encodeURIComponent(query)}`, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) {
        last = `HTTP ${res.status}`;
        continue;
      }
      const html = await res.text();
      const hits = readSearchPage(html);
      if (hits.length) return hits;
      last = /captcha|api-services-support@amazon\.com/i.test(html) ? 'robot check' : 'no results on page';
    } catch (err) {
      last = (err as Error).message;
    }
  }
  return { unknown: last };
}
