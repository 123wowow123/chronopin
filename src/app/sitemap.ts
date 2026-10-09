import type { MetadataRoute } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { absoluteUrl, pinPath } from '@/lib/seo';
import Pins from '@/server/model/pins';
import { offeredLocales, TAGS } from '@/server/services/cache';
import { hideThinPins } from '@/server/services/pages';
import { topicIndex } from '@/server/services/topics';
import { companyPath, MIN_INDEXED_PINS, tagPath } from '@/lib/topics';
import { DEFAULT_LOCALE, languageAlternates, type Locale } from '@/lib/i18n/config';
import { RESTAURANT_REGIONS } from '@/lib/restaurants';
import { GUIDE_PAGE_SIZE, GUIDE_VIEWS } from '@/lib/restaurantGuide';
import { restaurantGuideRegionSlugs } from '@/server/services/restaurants';
import { guideSummary } from '@/server/services/restaurantGuidePage';

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
  // Each city guide's lists, and their later pages, are crawlable URLs (?view=&page=).
  const now = new Date();
  const guidePaths = (await Promise.all((await restaurantGuideRegionSlugs()).map(async (slug) => {
    const summary = await guideSummary(slug, now);
    if (!summary) return [];
    return GUIDE_VIEWS.filter((view) => view !== 'discounts' && summary.counts[view] > 0).flatMap((view) =>
      Array.from({ length: Math.ceil(summary.counts[view] / GUIDE_PAGE_SIZE) }, (_, index) => `/restaurants/${slug}?view=${view}${index ? `&page=${index + 1}` : ''}`));
  }))).flat();
  // Thin pins say noindex while the admin setting is on (src/lib/searchQuality.ts), so they stay out.
  const pins = await Pins.listForSitemap(0, MAX_URLS - 9 - topics.length - RESTAURANT_REGIONS.length - guidePaths.length, (await hideThinPins()).enabled);
  const inEveryLanguage = (path: string) => {
    if (!offered.length) return undefined;
    const { languages = {} } = languageAlternates(path, DEFAULT_LOCALE, offered);
    return { languages: Object.fromEntries(Object.entries(languages).map(([lang, href]) => [lang, absoluteUrl(href)])) };
  };
  return [
    { url: absoluteUrl('/'), changeFrequency: 'hourly', priority: 1, alternates: inEveryLanguage('/') },
    ...RESTAURANT_REGIONS.map((region) => ({ url: absoluteUrl(`/restaurants/${region.slug}`), changeFrequency: 'daily' as const, priority: 0.7 })),
    ...guidePaths.map((path) => ({ url: absoluteUrl(path), changeFrequency: 'daily' as const, priority: 0.5 })),
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.4, alternates: inEveryLanguage('/about') },
    { url: absoluteUrl('/contact'), changeFrequency: 'yearly', priority: 0.3, alternates: inEveryLanguage('/contact') },
    // English only: the other languages' copies show the English text (src/components/legal/LegalPage.tsx).
    { url: absoluteUrl('/privacy'), changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl('/terms'), changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl('/map'), changeFrequency: 'daily', priority: 0.5, alternates: inEveryLanguage('/map') },
    { url: absoluteUrl('/tags'), changeFrequency: 'daily', priority: 0.6, alternates: inEveryLanguage('/tags') },
    { url: absoluteUrl('/products'), changeFrequency: 'daily', priority: 0.6, alternates: inEveryLanguage('/products') },
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
