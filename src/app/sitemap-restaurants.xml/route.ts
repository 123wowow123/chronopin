import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { absoluteUrl } from '@/lib/seo';
import { GUIDE_PAGE_SIZE, GUIDE_VIEWS, guideListPath } from '@/lib/restaurantGuide';
import { TAGS } from '@/server/services/cache';
import { guideCounts } from '@/server/services/restaurantGuidePage';
import { restaurantGuideRegionSlugs } from '@/server/services/restaurants';

// Each city guide's lists, and their later pages, are crawlable URLs
// (?view=&page=). They have a sitemap of their own: counting them builds every
// region's guide (menus and offers included), and doing all ~100 at once, inside
// /sitemap.xml, outlasted the proxy and ran a production app out of heap
// (2026-10-27). Here the regions are read one at a time.
async function guidePaths(): Promise<string[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.sitemap);
  const now = new Date();
  const paths: string[] = [];
  for (const slug of await restaurantGuideRegionSlugs()) {
    const counts = await guideCounts(slug, now);
    if (!counts) continue;
    // The default view's first page is the bare city URL, already in /sitemap.xml with the regions.
    for (const view of GUIDE_VIEWS.filter((v) => v !== 'discounts' && counts[v] > 0)) {
      for (let page = 1; page <= Math.ceil(counts[view] / GUIDE_PAGE_SIZE); page++) {
        const path = guideListPath(slug, counts, view, page);
        if (page > 1 || path.includes('?')) paths.push(path);
      }
    }
  }
  return paths;
}

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET() {
  await connection();
  const urls = (await guidePaths()).map((path) => `<url><loc>${escapeXml(absoluteUrl(path))}</loc><changefreq>daily</changefreq><priority>0.5</priority></url>`);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
