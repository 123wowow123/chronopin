import type { MetadataRoute } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { absoluteUrl, pinPath } from '@/lib/seo';
import Pins from '@/server/model/pins';
import { TAGS } from '@/server/services/cache';

// Google reads at most 50,000 URLs from one sitemap. Chronopin is far below
// that; past it, split this file with generateSitemaps.
const MAX_URLS = 50_000;

async function sitemapEntries(): Promise<MetadataRoute.Sitemap> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.sitemap);
  const pins = await Pins.listForSitemap(0, MAX_URLS - 2);
  return [
    { url: absoluteUrl('/'), changeFrequency: 'hourly', priority: 1 },
    { url: absoluteUrl('/map'), changeFrequency: 'daily', priority: 0.5 },
    ...pins.map((pin) => ({
      url: absoluteUrl(pinPath(pin)),
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
