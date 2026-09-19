// Pin fields read straight from a page's own markup, for a scrape that has no
// LLM answer (no API key or credit). Everything here is deterministic: Open
// Graph and meta tags, schema.org JSON-LD and the article's publish date. It
// fills only what the markup states and marks how sure the date is, so the
// author (or a Claude Code session answering the extraction task) can correct
// it. It never invents a company, category or location.

import type { ExtractedFields } from '../extract';
import type { PageMetadata } from './inPage';

const MAX_TITLE = 120;
const MAX_DESCRIPTION = 400;
const MAX_TAGS = 8;

type Node = Record<string, unknown>;
const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const nodeTypes = (node: Node): string[] => [node['@type']].flat().filter((t): t is string => typeof t === 'string');
const hasType = (node: Node, ...wanted: string[]) => nodeTypes(node).some((t) => wanted.some((w) => t === w || t.endsWith(`Event`) && w === 'Event'));

// Whether a title segment is the site: its og:site_name, or a name the host
// carries ("Wikipedia" on en.wikipedia.org).
const isSite = (segment: string, siteName?: string, host?: string) => {
  const name = segment.trim().toLowerCase();
  if (!name) return false;
  if (siteName && name === siteName.trim().toLowerCase()) return true;
  return !!host && name.length >= 4 && host.toLowerCase().replace(/[^a-z0-9.]/g, '').includes(name.replace(/[^a-z0-9]/g, ''));
};

// The site name a title carries as a suffix or prefix ("Headline | Site").
export function stripSiteName(title: string, siteName?: string, host?: string): string {
  const clean = title.replace(/\s+/g, ' ').trim();
  for (const separator of [' | ', ' - ', ' – ', ' — ', ' :: ', ' · ']) {
    const at = clean.lastIndexOf(separator);
    if (at > 0 && isSite(clean.slice(at + separator.length), siteName, host)) return clean.slice(0, at).trim();
    const start = clean.indexOf(separator);
    if (start > 0 && isSite(clean.slice(0, start), siteName, host)) return clean.slice(start + separator.length).trim();
  }
  return clean;
}

// An ISO 8601 date or datetime as UTC, and whether it carried a clock time.
export function isoDay(value: string | undefined): { iso: string; allDay: boolean } | undefined {
  if (!value) return undefined;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  const parsed = new Date(dateOnly ? `${value.trim()}T00:00:00Z` : value.trim());
  if (Number.isNaN(parsed.getTime())) return undefined;
  return { iso: parsed.toISOString(), allDay: dateOnly };
}

const flat = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function placeOf(event: Node): string | undefined {
  const location = [event.location].flat()[0] as Node | string | undefined;
  if (!location) return undefined;
  if (typeof location === 'string') return text(location);
  const address = location.address as Node | string | undefined;
  const parts =
    typeof address === 'string'
      ? [address]
      : [address?.streetAddress, address?.addressLocality, address?.addressRegion, address?.addressCountry].map((p) => (typeof p === 'object' && p ? text((p as Node).name) : text(p)));
  return [text(location.name), ...parts].filter((p, i, all): p is string => !!p && all.indexOf(p) === i).join(', ') || undefined;
}

export function metadataFields(meta: PageMetadata | null | undefined): Partial<ExtractedFields> {
  if (!meta) return {};
  const nodes = (meta.jsonLd || []) as Node[];
  const event = nodes.find((n) => hasType(n, 'Event'));
  const article = nodes.find((n) => hasType(n, 'Article', 'NewsArticle', 'BlogPosting', 'Report'));
  const product = nodes.find((n) => hasType(n, 'Product'));

  // og:title before an Article's headline: some sites (Wikipedia) put a short
  // description in the headline.
  const rawTitle = text(event?.name) || meta.ogTitle || meta.twitterTitle || text(article?.headline) || meta.h1 || meta.title;
  const title = rawTitle ? stripSiteName(rawTitle, meta.siteName, meta.host).slice(0, MAX_TITLE) : null;
  const rawDescription = text(event?.description) || meta.description || text(article?.description);
  const description = rawDescription ? flat(rawDescription).slice(0, MAX_DESCRIPTION) : null;

  const fields: Partial<ExtractedFields> = { title, description };

  const start = isoDay(text(event?.startDate));
  const published = isoDay(text(article?.datePublished) || meta.published);
  if (start) {
    const end = isoDay(text(event?.endDate));
    fields.startDateTime = start.iso;
    fields.endDateTime = end?.iso ?? null;
    fields.allDay = start.allDay;
    fields.dateConfidence = 'scheduled';
    fields.dateConfidenceReasoning = `Event markup on the page gives startDate ${text(event?.startDate)}.`;
  } else if (published) {
    fields.startDateTime = published.iso;
    fields.endDateTime = null;
    fields.allDay = published.allDay;
    fields.dateConfidence = 'unknown';
    fields.dateConfidenceReasoning = `Only the page's publish date (${published.iso.slice(0, 10)}) was found without reading the article; the event's own date needs review.`;
  }

  const place = event ? placeOf(event) : undefined;
  if (place) fields.placeLabel = place;

  const offer = [product?.offers].flat()[0] as Node | undefined;
  const price = Number(offer?.price ?? offer?.lowPrice);
  if (offer && Number.isFinite(price) && price > 0) {
    fields.price = price;
    fields.priceCurrency = text(offer.priceCurrency) ?? null;
  }

  const tags = [...(meta.keywords || [])].filter((t, i, all) => t.length <= 40 && all.findIndex((o) => o.toLowerCase() === t.toLowerCase()) === i).slice(0, MAX_TAGS);
  if (tags.length) fields.tags = tags;
  return fields;
}
