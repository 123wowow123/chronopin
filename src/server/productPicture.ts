// A picture for a company's product line (PinSentiment.product) when none of
// its pins has one, for the Major products panel (0079). In order:
//
//   1. The lead image of the product's Wikipedia article ("Tesla Cybertruck"),
//      freely licensed only (an English-only fair-use picture is skipped). The
//      article must be the product: its title (less any "(...)" qualifier) is
//      the product's name, or holds both the product and the company's name -
//      never a loose search hit.
//   2. Google Custom Search's first photo for "<company> <product>", when a key
//      and engine id are set (config.googleSearch). Its thumbnail is kept, not
//      the original: Google serves it to anyone, where the original's site
//      may refuse a picture linked from elsewhere.
//
// Only the dev machine runs this (`npm run products:pictures`, and the dev
// server after a pin's product is read) - prod stores what a local run sends.

import config from './config';
import * as db from './db';
import ProductPicture from './model/productPicture';
import log from './util/log';

export type FoundProductPicture = { pictureUrl: string; source: 'wikipedia' | 'google'; pageUrl: string };

// Wikimedia asks API clients to identify themselves.
const HEADERS = { 'User-Agent': 'ChronoPin/1.0 (https://chronopin.com; product picture lookup)' };
const FETCH_MS = 8000;
// A thumbnail width Wikimedia serves from its standard set.
const THUMB_WIDTH = 330;
const MIN_SIDE = 150;
const MAX_ASPECT = 2.5;

const plain = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
// "Tesla, Inc." -> "tesla": what an article title would say.
const COMPANY_SUFFIX = /[\s,]+(inc|incorporated|ltd|limited|llc|plc|corp|corporation|company|co|group|holdings|ag|sa|se|nv|gmbh|kk)\.?$/i;
const companyName = (name: string) => {
  let short = name.trim();
  while (COMPANY_SUFFIX.test(short)) short = short.replace(COMPANY_SUFFIX, '');
  return plain(short);
};

async function getJson(url: string, headers: Record<string, string> = HEADERS): Promise<any> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_MS) });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json();
}

const wikiApi = (params: Record<string, string>) =>
  getJson(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params })}`);

// Whether an article title is the product itself.
export function isProductArticle(title: string, company: string, product: string): boolean {
  const base = plain(title.replace(/\s*\([^)]*\)\s*$/, ''));
  const name = plain(product);
  if (!name) return false;
  if (base === name) return true;
  // Both names, apart: a restaurant named for its owner ("Odette") must not
  // match another article that only shares the one name ("Odette Annable").
  const maker = companyName(company);
  return !!maker && base.includes(name) && base.replace(name, '').includes(maker);
}

async function fromWikipedia(company: string, product: string): Promise<FoundProductPicture | null> {
  const queries = plain(product).includes(companyName(company)) ? [product] : [`${company} ${product}`, product];
  const seen = new Set<string>();
  for (const query of queries) {
    const search = await wikiApi({ list: 'search', srsearch: query, srlimit: '5' });
    const titles: string[] = (search.query?.search ?? [])
      .map((hit: { title: string }) => hit.title)
      .filter((title: string) => !seen.has(title) && isProductArticle(title, company, product));
    titles.forEach((title) => seen.add(title));
    if (!titles.length) continue;
    const pages = await wikiApi({
      prop: 'pageimages|pageprops',
      piprop: 'thumbnail',
      pithumbsize: String(THUMB_WIDTH),
      ppprop: 'disambiguation',
      redirects: '1',
      titles: titles.join('|'),
    });
    const byTitle = new Map<string, any>((pages.query?.pages ?? []).map((page: any) => [page.title, page]));
    // A redirect lands on its target, which must still be the product.
    const redirected = new Map<string, string>((pages.query?.redirects ?? []).map((r: { from: string; to: string }) => [r.from, r.to]));
    for (const asked of titles) {
      const title = redirected.get(asked) ?? asked;
      const page = byTitle.get(title);
      if (!page || page.missing || (page.pageprops && 'disambiguation' in page.pageprops)) continue;
      if (title !== asked && !isProductArticle(title, company, product)) continue;
      if (page.thumbnail?.source) {
        return { pictureUrl: page.thumbnail.source, source: 'wikipedia', pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` };
      }
    }
  }
  return null;
}

async function fromGoogle(company: string, product: string): Promise<FoundProductPicture | null> {
  const { apiKey, engineId } = config.googleSearch;
  const query = plain(product).includes(companyName(company)) ? product : `${company} ${product}`;
  const json = await getJson(
    `https://www.googleapis.com/customsearch/v1?${new URLSearchParams({ key: apiKey, cx: engineId, q: query, searchType: 'image', num: '10', safe: 'active', imgType: 'photo' })}`,
    {},
  );
  const items: { image?: { thumbnailLink?: string; contextLink?: string; width?: number; height?: number } }[] = json.items ?? [];
  const pick = items.find(({ image }) => {
    if (!image?.thumbnailLink || !image.width || !image.height) return false;
    const aspect = Math.max(image.width, image.height) / Math.min(image.width, image.height);
    return Math.min(image.width, image.height) >= MIN_SIDE && aspect <= MAX_ASPECT;
  });
  return pick?.image ? { pictureUrl: pick.image.thumbnailLink!, source: 'google', pageUrl: pick.image.contextLink ?? '' } : null;
}

export const googleSearchConfigured = () => !!(config.googleSearch.apiKey && config.googleSearch.engineId);

// The picture, or null when none was found. `searched` says whether every
// source was tried: with no Google key a miss is only Wikipedia's, and is not
// worth recording as final.
export async function findProductPicture(company: string, product: string): Promise<{ found: FoundProductPicture | null; searched: boolean }> {
  let failed = false;
  try {
    const found = await fromWikipedia(company, product);
    if (found) return { found, searched: true };
  } catch (err) {
    failed = true;
    log.warn(`product picture: wikipedia failed for ${company} / ${product}:`, (err as Error).message);
  }
  if (!googleSearchConfigured()) return { found: null, searched: false };
  try {
    return { found: await fromGoogle(company, product), searched: !failed };
  } catch (err) {
    log.warn(`product picture: google failed for ${company} / ${product}:`, (err as Error).message);
    return { found: null, searched: false };
  }
}

// After a pin's product is read on the dev machine: when none of that
// product's pins has a picture and it was never looked up, look it up now.
export async function pictureProductOf(pinId: number): Promise<void> {
  const [pin] = await db.query<{ companyId: number; product: string }>(
    `SELECT "Pin"."companyId", "PinSentiment"."product" FROM "Pin" JOIN "PinSentiment" ON "PinSentiment"."pinId" = "Pin"."id"
     WHERE "Pin"."id" = $1 AND "Pin"."companyId" IS NOT NULL AND "PinSentiment"."product" IS NOT NULL`,
    [pinId],
  );
  if (!pin) return;
  const line = (await ProductPicture.needing({ companyId: pin.companyId })).find((p) => p.product.toLowerCase() === pin.product.toLowerCase());
  if (!line) return;
  const { found, searched } = await findProductPicture(line.company, line.product);
  if (found || searched) {
    await ProductPicture.set({ companyId: line.companyId, product: line.product, pictureUrl: found?.pictureUrl ?? null, source: found?.source, pageUrl: found?.pageUrl || null });
  }
}
