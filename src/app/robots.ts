import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/appConfig';
import { AI_BOT_NAMES } from '@/lib/bots';
import { DEFAULT_LOCALE, LOCALES } from '@/lib/i18n/config';
import { PER_SECOND } from '@/server/botLimit';

// Account and editing pages, in English and under every other language.
const PRIVATE_PAGES = ['/admin', '/settings', '/preferences', '/profile', '/following', '/notifications', '/create', '/update/', '/respond/', '/login', '/signup'];

const DISALLOW = [
  '/api/',
  '/auth/',
  '/upload/',
  '/logout',
  ...PRIVATE_PAGES,
  ...LOCALES.filter((l) => l !== DEFAULT_LOCALE).flatMap((l) => PRIVATE_PAGES.map((path) => `/${l}${path}`)),
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      // AI crawlers are asked for the pace src/proxy.ts holds them to (a 429
      // past it). A bot with its own group skips the * one, so the same pages
      // are closed here too.
      { userAgent: AI_BOT_NAMES, allow: '/', disallow: DISALLOW, crawlDelay: 1 / PER_SECOND },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
