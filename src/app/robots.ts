import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/appConfig';
import { DEFAULT_LOCALE, LOCALES } from '@/lib/i18n/config';

// Account and editing pages, in English and under every other language.
const PRIVATE_PAGES = ['/admin', '/settings', '/preferences', '/profile', '/following', '/notifications', '/create', '/update/', '/respond/', '/login', '/signup'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/upload/',
          '/logout',
          ...PRIVATE_PAGES,
          ...LOCALES.filter((l) => l !== DEFAULT_LOCALE).flatMap((l) => PRIVATE_PAGES.map((path) => `/${l}${path}`)),
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
