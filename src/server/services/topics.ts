// Data for the /tag and /company landing pages (src/lib/topics.ts), cached
// with Cache Components like the rest of src/server/services/pages.ts.

import { cacheLife, cacheTag } from 'next/cache';
import Company from '../model/company';
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
  company: { name: string; description: string | null; logoUrl: string | null; wikiUrl: string | null; websiteUrl: string | null };
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
  const page = await topicPins(row.name, ids, index, locale, { company: row.name });
  return {
    ...page,
    company: { name: row.name, description: row.description, logoUrl: row.logoUrl, wikiUrl: row.wikiUrl, websiteUrl: row.websiteUrl },
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
