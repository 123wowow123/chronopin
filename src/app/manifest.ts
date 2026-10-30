import type { MetadataRoute } from 'next';
import { siteName } from '@/lib/appConfig';

// What makes the site installable ("Add to Home Screen"): an installed copy
// opens in its own window and, on iPhone, is the only place Web Push works
// (public/sw.js, src/server/push.ts). Not localized: a manifest is one file
// for the whole site, and start_url "/" lands on the reader's own language
// through the proxy. The icons are rendered from the logo by
// npm run favicon:build; theme_color matches the dark navbar, and ThemeSync
// keeps the open page's own.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: siteName,
    short_name: siteName,
    description: 'Discover and track upcoming release dates, events, and other important dates.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#111111',
    theme_color: '#13161b',
    categories: ['news', 'lifestyle', 'utilities'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
