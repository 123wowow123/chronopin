import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/appConfig';
import { DEFAULT_LOCALE, LOCALES } from '@/lib/i18n/config';
import { PER_SECOND, THROTTLED_BOT_NAMES } from '@/server/botLimit';

// Account and editing pages, in English and under every other language.
const PRIVATE_PAGES = ['/admin', '/settings', '/preferences', '/profile', '/following', '/notifications', '/create', '/update/', '/respond/', '/login', '/signup'];

const DISALLOW = [
  // Next.js client-navigation (RSC) payloads. Search Console's crawl stats show
  // these `?_rsc=` fetches as ~73% of Googlebot's requests ("Other file type"):
  // they are not pages, and a rendered page already carries its own payload inline.
  '/*?_rsc=',
  '/*&_rsc=',
  '/api/',
  '/auth/',
  '/upload/',
  '/logout',
  ...PRIVATE_PAGES,
  ...LOCALES.filter((l) => l !== DEFAULT_LOCALE).flatMap((l) => PRIVATE_PAGES.map((path) => `/${l}${path}`)),
];

// Licensed use only, as Reddit does: AI crawlers and bulk scrapers are shut out
// of everything (they may read nothing, not even /llms.txt) unless they hold a
// written agreement. Applebot stays on the throttled group: it feeds Siri and
// Spotlight search, not model training.
const PAGE_BOTS = ['Applebot'];
const UNLICENSED_BOTS = THROTTLED_BOT_NAMES.filter((name) => !PAGE_BOTS.includes(name));

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      { userAgent: UNLICENSED_BOTS, disallow: '/' },
      // Throttled crawlers are asked for the per-bot pace (a 429
      // past it). A bot with its own group skips the * one, so the same pages
      // are closed here too.
      { userAgent: PAGE_BOTS, allow: '/', disallow: DISALLOW, crawlDelay: 1 / PER_SECOND },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/sitemap-restaurants.xml`],
    host: siteUrl,
  };
}
