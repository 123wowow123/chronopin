// Independent reviews kept beside a pin's radar (PinTaste.reviews, 0161;
// PinCarPerf.reviews, 0168): a page that describes how THIS product tastes or
// drives (not an announcement), fetched by whoever stored it, with a short
// extract. Shared by the taste and car performance rubrics, so both validate
// and draw them the same way.

// sentiment: how the review feels about the product, -1..1, scored from its
// quote (src/server/extract/reviewSentiment.ts); absent until scored. The
// sentiment graph on a pin plots it at publishedDate.
export type PinReview = { url: string; title: string | null; publishedDate: string | null; quote: string | null; sentiment?: number | null };

// A review is a web page; nothing else is stored or linked.
const WEB_URL = /^https?:\/\/\S+$/i;

// A real calendar day written YYYY-MM-DD (the page formats it with Intl, which
// throws on 2026-13-45).
const isIsoDay = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const day = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === value;
};

// The reviews, cleaned (a repeated url is kept once), or a sentence saying what
// is wrong with them. Null or an empty list is no reviews.
export function reviewsProblem(value: unknown, { max, maxQuote }: { max: number; maxQuote: number }): PinReview[] | string {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max) return `reviews is a list of at most ${max}.`;
  const seen = new Set<string>();
  const reviews: PinReview[] = [];
  for (const raw of value as Record<string, unknown>[]) {
    const url = raw && typeof raw.url === 'string' ? raw.url.trim() : '';
    if (!WEB_URL.test(url) || url.length > 4000) return 'A review needs an http(s) url.';
    if (seen.has(url)) continue;
    seen.add(url);
    const text = (key: 'title' | 'quote', limit: number): string | null | { problem: string } => {
      const v = raw[key];
      if (v == null || v === '') return null;
      return typeof v === 'string' && v.trim().length <= limit ? v.trim() || null : { problem: `A review ${key} is a string of at most ${limit} characters.` };
    };
    const title = text('title', 300);
    const quote = text('quote', maxQuote);
    if (title && typeof title === 'object') return title.problem;
    if (quote && typeof quote === 'object') return quote.problem;
    const publishedDate = raw.publishedDate == null || raw.publishedDate === '' ? null : String(raw.publishedDate);
    if (publishedDate && !isIsoDay(publishedDate)) return 'A review publishedDate must be YYYY-MM-DD.';
    const given = raw.sentiment;
    if (given != null && (typeof given !== 'number' || !Number.isFinite(given) || given < -1 || given > 1)) return 'A review sentiment is a number from -1 to 1.';
    reviews.push(given == null ? { url, title, publishedDate, quote } : { url, title, publishedDate, quote, sentiment: Math.round(given * 100) / 100 });
  }
  return reviews;
}

// The rubric tables that keep scraped reviews in a `reviews` column.
export const REVIEW_TABLES = ['PinTaste', 'PinCarPerf', 'PinGasCarPerf', 'PinAircraftPerf', 'PinLlmPerf', 'PinVideoPerf', 'PinHotel', 'PinDining'] as const;
export type ReviewTable = (typeof REVIEW_TABLES)[number];
