import { cacheLife } from 'next/cache';
import { siteName } from '@/lib/appConfig';

// The UTC day, which the site's share card URL carries. Cached by the hour,
// so the new day's URL is out within an hour of midnight.
async function shareCardDay(): Promise<string> {
  'use cache';
  cacheLife('hours');
  return new Date().toISOString().slice(0, 10);
}

// The site's share card (src/app/og/site), for a page with no picture of its
// own. A page that sets its own openGraph replaces the root layout's whole
// object, images included, so each of those pages passes these too: without
// an og:image, Messenger and Facebook show a bare title where Messages shows
// a card. Its collage of recent pins is rebuilt daily, and the day in the URL
// makes sites that keep a preview by its URL fetch the new one.
export async function siteCardImages() {
  return [{ url: `/og/site?d=${await shareCardDay()}`, width: 1200, height: 630, alt: siteName }];
}
