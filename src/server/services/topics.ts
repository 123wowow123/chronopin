// Data for the /tag and /company landing pages (src/lib/topics.ts), cached
// with Cache Components like the rest of src/server/services/pages.ts.

import { cacheLife, cacheTag } from 'next/cache';
import Comment from '../model/comment';
import Company from '../model/company';
import PinSentiment from '../model/pinSentiment';
import type { CompanySentiment } from '@/lib/companySentiment';
import { companyHubTree, companySegments, hubPinOfCompany } from '../model/companyHub';
import * as db from '../db';
import type { CompanyHubJson } from '@/lib/companyHub';
import type { SegmentRow } from '@/lib/companySegments';
import { branchMilestones, branchPins, findProduct, overviewParagraphs, type HubProductJson } from '@/lib/companyHub';
import Pins from '../model/pins';
import Topics, { type TopicPinIds } from '../model/topics';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { MIN_INDEXED_PINS, topicSlug } from '@/lib/topics';
import { toJson, type PinJson } from '@/lib/types';
import { TAGS } from './cache';
import { timelineMinConfidence } from './timeline';
import { localizePins } from './translations';

export type TopicEntry = { slug: string; name: string; pins: number };
export type TagEntry = TopicEntry & { kind: string };
export type CompanyEntry = TopicEntry & { id: number };

const UPCOMING = 48;
const PAST = 24;
const RELATED = 16;

// Every tag and company with a shown pin, busiest first, each under one slug:
// two names that slug alike ("F1" and "f-1") go to the busier one.
export async function topicIndex(): Promise<{ tags: TagEntry[]; companies: CompanyEntry[] }> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.sitemap);
  const minConfidence = await timelineMinConfidence();
  const [tags, companies] = await Promise.all([Topics.tags(minConfidence), Topics.companies(minConfidence)]);
  return {
    tags: bySlug(tags.map((t) => ({ ...t, slug: topicSlug(t.name) }))),
    companies: bySlug(companies.map((c) => ({ ...c, slug: topicSlug(c.name) }))),
  };
}

function bySlug<T extends TopicEntry>(entries: T[]): T[] {
  const kept = new Map<string, T>();
  for (const entry of entries.sort((a, b) => b.pins - a.pins || a.name.localeCompare(b.name))) {
    if (entry.slug && !kept.has(entry.slug)) kept.set(entry.slug, entry);
  }
  return [...kept.values()];
}

export type TopicPage = {
  name: string;
  upcoming: PinJson[];
  past: PinJson[];
  upcomingCount: number;
  total: number;
  // The subject's neighbours with pages of their own: the tags its pins
  // carry most, and for a tag, the companies behind them.
  relatedTags: TagEntry[];
  relatedCompanies: CompanyEntry[];
  indexable: boolean;
};

export type CompanyTopicPage = TopicPage & {
  company: { name: string; description: string | null; logoUrl: string | null; wikiUrl: string | null; websiteUrl: string | null; ticker: string | null; sentiment: CompanySentiment | null; hub: { id: number; title: string; description: string | null; summary: string | null } | null };
};

export async function tagPage(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<(TopicPage & { kind: string }) | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline, TAGS.sitemap);
  const index = await topicIndex();
  const tag = index.tags.find((t) => t.slug === slug);
  if (!tag) return null;
  const ids = await Topics.tagPinIds(tag.name, new Date(), { upcoming: UPCOMING, past: PAST }, await timelineMinConfidence());
  return { ...(await topicPins(tag.name, ids, index, locale, { tag: tag.name })), kind: tag.kind };
}

export async function companyPage(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<CompanyTopicPage | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline, TAGS.sitemap);
  const index = await topicIndex();
  const entry = index.companies.find((c) => c.slug === slug);
  if (!entry) return null;
  const [row, ids] = await Promise.all([
    Company.getById(entry.id),
    Topics.companyPinIds(entry.id, new Date(), { upcoming: UPCOMING, past: PAST }, await timelineMinConfidence()),
  ]);
  if (!row) return null;
  const [pinTones, tones] = await Promise.all([PinSentiment.forCompany(entry.id), Comment.forCompany(entry.id, 200)]);
  const sentiment: CompanySentiment | null =
    pinTones.length || tones.length
      ? {
          pins: pinTones.map((p) => ({ id: p.id, title: p.title, at: p.utcStartDateTime.toISOString(), value: p.sentiment, product: p.product })),
          comments: tones
            .filter((c): c is typeof c & { sentiment: number } => c.sentiment != null)
            .map((c) => ({ at: c.utcCreatedDateTime.toISOString(), value: c.sentiment, pinId: c.pinId }))
            .reverse(),
        }
      : null;
  const hubId = await hubPinOfCompany(entry.id);
  const hubRow = hubId ? (await Pins.queryByIds([hubId])).pins[0] : null;
  cacheTag(...(hubId ? [TAGS.pin(hubId)] : []));
  const page = await topicPins(row.name, ids, index, locale, { company: row.name });
  return {
    ...page,
    company: { name: row.name, description: row.description, logoUrl: row.logoUrl, wikiUrl: row.wikiUrl, websiteUrl: row.websiteUrl, ticker: await Company.tickerOf(entry.id), sentiment, hub: hubId && hubRow ? { id: hubId, title: hubRow.title, description: hubRow.description ?? null, summary: hubRow.longFormSummary ?? null } : null },
  };
}

async function topicPins(
  name: string,
  ids: TopicPinIds,
  index: { tags: TagEntry[]; companies: CompanyEntry[] },
  locale: Locale,
  self: { tag?: string; company?: string },
): Promise<TopicPage> {
  const loaded = toJson<PinJson[]>((await Pins.queryByIds([...ids.upcomingIds, ...ids.pastIds])).pins);
  const byId = new Map(loaded.map((p) => [p.id, p]));
  const inOrder = (list: number[]) => list.map((id) => byId.get(id)).filter((p): p is PinJson => !!p);
  const upcoming = inOrder(ids.upcomingIds);
  const past = inOrder(ids.pastIds);
  await localizePins([...upcoming, ...past], locale);
  const pins = [...upcoming, ...past];

  // Neighbours: the subjects these pins share most, among those with an
  // indexable page of their own.
  const tagCounts = tally(pins.flatMap((p) => [...(p.categories ?? []), ...(p.tags ?? []).map((t) => t.name)]), self.tag);
  const companyCounts = tally(pins.flatMap((p) => (p.company ? [p.company] : [])), self.company);
  const tags = new Map(index.tags.filter((t) => t.pins >= MIN_INDEXED_PINS).map((t) => [t.name.toLowerCase(), t]));
  const companies = new Map(index.companies.filter((c) => c.pins >= MIN_INDEXED_PINS).map((c) => [c.name.toLowerCase(), c]));
  const pick = <T,>(counts: [string, number][], from: Map<string, T>) =>
    counts.map(([n]) => from.get(n)).filter((e): e is T => !!e).slice(0, RELATED);

  return {
    name,
    upcoming,
    past,
    upcomingCount: ids.upcoming,
    total: ids.total,
    relatedTags: pick(tagCounts, tags),
    relatedCompanies: pick(companyCounts, companies),
    indexable: ids.total >= MIN_INDEXED_PINS,
  };
}

// Names by how often they occur, case-insensitively, the page's own aside.
function tally(names: string[], self?: string): [string, number][] {
  const counts = new Map<string, number>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (key !== self?.toLowerCase() && key !== 'thread') counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}

export type CompanyProductPage = {
  company: { name: string; hubPinId: number | null };
  product: HubProductJson;
  ancestors: HubProductJson[];
  upcoming: PinJson[];
  past: PinJson[];
  // Its major events, oldest first, with the full pin for the picture.
  milestones: { label: string; pin: PinJson }[];
  // The pins its overview cites, by number (see overviewParagraphs).
  cited: { id: number; title: string }[];
};

// A product of a company's hub tree: its sub-products and every pin under it.
export async function companyProductPage(companySlug: string, productSlugged: string, locale: Locale = DEFAULT_LOCALE): Promise<CompanyProductPage | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline);
  const entry = (await topicIndex()).companies.find((c) => c.slug === companySlug);
  if (!entry) return null;
  const tree = await companyHubTree(entry.id, entry.name);
  const found = findProduct(tree.products, productSlugged);
  if (!found) return null;
  const listed = branchPins(found.product);
  cacheTag(...listed.map((p) => TAGS.pin(p.id)));
  const loaded = toJson<PinJson[]>((await Pins.queryByIds(listed.map((p) => p.id))).pins);
  const byId = new Map(loaded.map((p) => [p.id, p]));
  const pins = await localizePins(listed.flatMap((p) => (byId.has(p.id) ? [byId.get(p.id)!] : [])), locale);
  const { cited: citedIds } = overviewParagraphs(found.product.overview);
  const factIds = found.product.facts.flatMap((f) => (f.pinId ? [f.pinId] : []));
  const allCited = [...new Set([...citedIds, ...factIds])];
  const titles = allCited.length ? await db.query<{ id: number; title: string }>(`SELECT "id", "title" FROM "Pin" WHERE "id" = ANY($1::integer[]) AND "utcDeletedDateTime" IS NULL`, [allCited]) : [];
  cacheTag(...allCited.map((id) => TAGS.pin(id)));
  const now = Date.now();
  return {
    milestones: branchMilestones(found.product).flatMap((m) => (byId.has(m.pin.id) ? [{ label: m.label, pin: pins.find((p) => p.id === m.pin.id) ?? byId.get(m.pin.id)! }] : [])),
    cited: allCited.flatMap((id) => titles.filter((t) => t.id === id)),
    company: { name: entry.name, hubPinId: await hubPinOfCompany(entry.id) },
    product: found.product,
    ancestors: found.ancestors,
    upcoming: pins.filter((p) => new Date(p.utcStartDateTime).getTime() >= now),
    past: pins.filter((p) => new Date(p.utcStartDateTime).getTime() < now).reverse(),
  };
}

// Everything a company's hub landing page draws: the company page, its product tree.
export async function companyHubView(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<{ page: CompanyTopicPage; tree: CompanyHubJson; segments: SegmentRow[]; milestones: { label: string; productName: string; pin: PinJson }[] } | null> {
  'use cache';
  cacheLife('hours');
  const page = await companyPage(slug, locale);
  if (!page?.company.hub) return null;
  const entry = (await topicIndex()).companies.find((c) => c.slug === slug);
  if (!entry) return null;
  const tree = await companyHubTree(entry.id, page.name);
  const listed = (products: CompanyHubJson['products']): number[] => products.flatMap((p) => [...p.pins.map((x) => x.id), ...listed(p.children)]);
  cacheTag(TAGS.timeline, TAGS.pin(page.company.hub.id), ...listed(tree.products).map((id) => TAGS.pin(id)));
  // The major events across every product, oldest first.
  const events = tree.products.flatMap(branchMilestones).sort((a, b) => a.pin.utcStartDateTime.localeCompare(b.pin.utcStartDateTime));
  const loaded = events.length ? toJson<PinJson[]>((await Pins.queryByIds(events.map((e) => e.pin.id))).pins) : [];
  const localized = await localizePins(loaded, locale);
  const byId = new Map(localized.map((p) => [p.id, p]));
  const milestones = events.flatMap((e) => (byId.has(e.pin.id) ? [{ label: e.label, productName: e.product.name, pin: byId.get(e.pin.id)! }] : []));
  const segments = await companySegments(entry.id);
  cacheTag(...segments.flatMap((r) => (r.pinId ? [TAGS.pin(r.pinId)] : [])));
  return { page, tree, segments, milestones };
}
