import type { MetadataRoute } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { absoluteUrl, pinPath } from '@/lib/seo';
import Pins from '@/server/model/pins';
import { TAGS } from '@/server/services/cache';
import { DEFAULT_LOCALE, languageAlternates } from '@/lib/i18n/config';

// Google reads at most 50,000 URLs from one sitemap. Chronopin is far below
// that; past it, split this file with generateSitemaps. Each entry is the
// English page, with its other languages as hreflang alternates.
const MAX_URLS = 50_000;

function inEveryLanguage(path: string) {
  const { languages } = languageAlternates(path, DEFAULT_LOCALE);
  return { languages: Object.fromEntries(Object.entries(languages).map(([lang, href]) => [lang, absoluteUrl(href)])) };
}

async function sitemapEntries(): Promise<MetadataRoute.Sitemap> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.sitemap);
  const pins = await Pins.listForSitemap(0, MAX_URLS - 2);
  return [
    { url: absoluteUrl('/'), changeFrequency: 'hourly', priority: 1, alternates: inEveryLanguage('/') },
    { url: absoluteUrl('/map'), changeFrequency: 'daily', priority: 0.5, alternates: inEveryLanguage('/map') },
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
  return sitemapEntries();
}
