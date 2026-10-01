import type { MetadataRoute } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { absoluteUrl, pinPath } from '@/lib/seo';
import Pins from '@/server/model/pins';
import { offeredLocales, TAGS } from '@/server/services/cache';
import { topicIndex } from '@/server/services/topics';
import { companyPath, MIN_INDEXED_PINS, tagPath } from '@/lib/topics';
import { DEFAULT_LOCALE, languageAlternates, type Locale } from '@/lib/i18n/config';

// Google reads at most 50,000 URLs from one sitemap. Chronopin is far below
// that; past it, split this file with generateSitemaps. Each entry is the
// English page, with the other languages offered as hreflang alternates
// (src/lib/multilingual.ts).
const MAX_URLS = 50_000;

async function sitemapEntries(offered: readonly Locale[]): Promise<MetadataRoute.Sitemap> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.sitemap);
  // The tag and company pages worth indexing (src/lib/topics.ts), then pins.
  const index = await topicIndex();
  const topics = [
    ...index.tags.filter((t) => t.pins >= MIN_INDEXED_PINS).map((t) => tagPath(t.name)),
    ...index.companies.filter((c) => c.pins >= MIN_INDEXED_PINS).map((c) => companyPath(c.name)),
  ];
  const pins = await Pins.listForSitemap(0, MAX_URLS - 4 - topics.length);
  const inEveryLanguage = (path: string) => {
    if (!offered.length) return undefined;
    const { languages = {} } = languageAlternates(path, DEFAULT_LOCALE, offered);
    return { languages: Object.fromEntries(Object.entries(languages).map(([lang, href]) => [lang, absoluteUrl(href)])) };
  };
  return [
    { url: absoluteUrl('/'), changeFrequency: 'hourly', priority: 1, alternates: inEveryLanguage('/') },
    { url: absoluteUrl('/map'), changeFrequency: 'daily', priority: 0.5, alternates: inEveryLanguage('/map') },
    { url: absoluteUrl('/tags'), changeFrequency: 'daily', priority: 0.6, alternates: inEveryLanguage('/tags') },
    { url: absoluteUrl('/companies'), changeFrequency: 'daily', priority: 0.6, alternates: inEveryLanguage('/companies') },
    ...topics.map((path) => ({ url: absoluteUrl(path), alternates: inEveryLanguage(path), changeFrequency: 'daily' as const, priority: 0.7 })),
    ...pins.map((pin) => ({
      url: absoluteUrl(pinPath(pin)),
      alternates: inEveryLanguage(pinPath(pin)),
      lastModified: pin.lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Rendered per request (then cached), so building the app needs no database.
  await connection();
  return sitemapEntries(await offeredLocales());
}
