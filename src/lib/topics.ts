// Landing pages for a tag (/tag/anime) and a company (/company/nintendo):
// the dates one subject has coming up, at a URL search engines and answer
// engines can index. Clicking a tag or company label still searches (the
// search box is where filters live); these pages are what the sitemap,
// /llms.txt and each other link to.

import { slugify } from './categories';

// A subject with fewer pins than this gets a page, but asks not to be
// indexed and is left out of the sitemap: one pin is the pin's own page again.
// 8, not 3, since AdSense turned the site down as "low value content" (Oct
// 2026): a page of three cards is thin. On prod that keeps 491 of 1,694 tags
// and 121 of 373 companies.
export const MIN_INDEXED_PINS = 8;

// The URL word for a tag or company name: its Latin slug, or for a name in
// another script (长生骨), the name itself, lowercased, with dashes for spaces.
export function topicSlug(name: string): string {
  return (
    slugify(name) ||
    name
      .trim()
      .toLowerCase()
      .replace(/[\s/?#%\\]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

export function tagPath(name: string): string {
  return `/tag/${encodeURIComponent(topicSlug(name))}`;
}

export function companyPath(name: string): string {
  return `/company/${encodeURIComponent(topicSlug(name))}`;
}
