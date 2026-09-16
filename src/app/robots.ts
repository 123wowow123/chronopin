import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/appConfig';

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
          '/admin',
          '/settings',
          '/preferences',
          '/profile',
          '/following',
          '/notifications',
          '/create',
          '/update/',
          '/respond/',
          '/login',
          '/signup',
          '/logout',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
