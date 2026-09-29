// The maker's own page for a product pin's product ("PUMA MB.06 Shooting
// Star" -> us.puma.com/.../pd/mb06-shooting-star-basketball-shoes/313624), so
// its buy buttons (src/lib/shopping.ts) lead with the brand's store rather than
// only searches of resellers.
//
// Found among the links of the page being pinned: articles about a release
// link the brand's product page, often through an affiliate redirect, which is
// unwrapped, or a collection page of the maker's that lists it (followed one
// hop to the product links whose URL spells the product's name). A link counts when it is on the maker's site (the company's
// websiteUrl domain, or a host named after the company) and the page it leads
// to marks itself up as that very product: schema.org Product markup whose
// name, with the brand, has every word of the product name (isExactListing).
// A colorway or edition the product name gives and the page does not is a
// different product, and no link at all beats a link to the wrong one.

import { isExactListing } from '@/lib/shopping';
import { readOfferMarkup } from './listingPrice';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml',
};
const TIMEOUT_MS = 15_000;
// Pages fetched per pin: product links come first, so a few are enough.
const MOST_CHECKED = 6;

export type BrandListing = { label: string; url: string; price?: number };

// Second-level labels under which a country's domains sit (example.co.uk).
const COUNTRY_SECOND_LEVEL = new Set(['co', 'com', 'net', 'org', 'ac', 'ne', 'or']);

// The registrable domain of a site: us.puma.com -> puma.com, sony.co.uk ->
// sony.co.uk.
export function siteDomain(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  const labels = host.split('.');
  if (labels.length < 2) return undefined;
  const keep = labels.length >= 3 && labels.at(-1)!.length === 2 && COUNTRY_SECOND_LEVEL.has(labels.at(-2)!) ? 3 : 2;
  return labels.slice(-keep).join('.');
}

const slug = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

// Whether a link's host is the maker's: on its website's domain, or with a
// label that is the company's name ("new balance" -> newbalance.com).
export function isMakerHost(host: string, company: string, websiteUrl?: string | null): boolean {
  const h = host.toLowerCase();
  const domain = siteDomain(websiteUrl);
  if (domain && (h === domain || h.endsWith(`.${domain}`))) return true;
  const name = slug(company);
  return name.length >= 3 && h.split('.').slice(0, -1).includes(name);
}

// The store page behind an affiliate or tracking redirect: a query value that
// is itself a URL (go.redirectingat.com?url=, linksynergy murl=, skimlinks,
// viglink u=), or partnerize's destination: path.
export function unwrapLink(link: string): string | undefined {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return undefined;
  }
  if (!/^https?:$/.test(url.protocol)) return undefined;
  for (const value of url.searchParams.values()) {
    if (/^https?:\/\//i.test(value)) return unwrapLink(value);
  }
  const destination = url.pathname.match(/\/destination:(https?.+)$/)?.[1];
  if (destination) return unwrapLink(decodeURIComponent(destination));
  url.hash = '';
  return url.toString();
}

// Paths that look like one product's page rather than a category or the home
// page, tried first.
const PRODUCT_PATH = /\/(pd|p|t|dp|product|products|shop|buy)\/|\d{5,}|\.html$/i;

// The page's links worth fetching, product-looking ones first, each once.
export function makerLinks(links: string[], company: string, websiteUrl?: string | null): string[] {
  const seen = new Set<string>();
  const found: string[] = [];
  for (const link of links) {
    const url = unwrapLink(link);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const parsed = new URL(url);
    if (parsed.pathname.length <= 1 || !isMakerHost(parsed.hostname, company, websiteUrl)) continue;
    found.push(url);
  }
  return [...found.filter((u) => PRODUCT_PATH.test(new URL(u).pathname)), ...found.filter((u) => !PRODUCT_PATH.test(new URL(u).pathname))];
}

type ProductMarkup = { name: string; brand?: string; color?: string };

// The Product a page's schema.org JSON-LD describes, if it describes one.
export function productMarkup(html: string): ProductMarkup | undefined {
  let product: ProductMarkup | undefined;
  const visit = (node: unknown): void => {
    if (product || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    const record = node as Record<string, unknown>;
    const types = ([] as unknown[]).concat(record['@type'] ?? []).map(String);
    if (types.some((t) => /^(Product|ProductGroup|IndividualProduct|VideoGame)$/.test(t)) && typeof record.name === 'string') {
      const brand = record.brand as { name?: unknown } | string | undefined;
      product = {
        name: record.name,
        brand: typeof brand === 'string' ? brand : typeof brand?.name === 'string' ? brand.name : undefined,
        color: typeof record.color === 'string' ? record.color : undefined,
      };
      return;
    }
    for (const key of ['@graph', 'mainEntity', 'itemListElement']) if (record[key]) visit(record[key]);
  };
  for (const [, body] of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(body));
    } catch {
      // A page's broken block says nothing about its others.
    }
  }
  return product;
}

// Whether a page's product markup is the product itself, with the brand and
// colour the store keeps beside the name counted as part of it.
export function isSameProduct(productName: string, company: string, markup: ProductMarkup): boolean {
  return isExactListing(productName, [markup.brand, company, markup.name, markup.color].filter(Boolean).join(' '));
}

// The words of the product name that are not the brand's, as a URL spells
// them: "PUMA MB.06 Shooting Star" -> mb06, shooting, star.
export function nameSlugs(productName: string, company: string): string[] {
  const brand = new Set(company.split(/\s+/).map(slug));
  return productName
    .split(/[\s/'"\u2018\u2019\u201c\u201d()-]+/)
    .map(slug)
    .filter((w) => w && !brand.has(w) && w !== slug(company) && !['the', 'and', 'of', 'x', 'edition'].includes(w));
}

// A maker's page that is not the product (a collection, a launch page) links
// its products: those whose URL spells every word of the product name,
// shortest first, as the adult shoe's URL is shorter than the kids' sizes'.
export function productLinksIn(html: string, pageUrl: string, productName: string, company: string, websiteUrl?: string | null): string[] {
  const wanted = nameSlugs(productName, company);
  if (!wanted.length) return [];
  const found = new Set<string>();
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    let url: URL;
    try {
      url = new URL(href.replace(/&amp;/g, '&'), pageUrl);
    } catch {
      continue;
    }
    if (!isMakerHost(url.hostname, company, websiteUrl) || !PRODUCT_PATH.test(url.pathname)) continue;
    let path: string;
    try {
      path = slug(decodeURIComponent(url.pathname));
    } catch {
      continue;
    }
    if (wanted.every((w) => path.includes(w))) found.add(url.toString());
  }
  return [...found].sort((a, b) => new URL(a).pathname.length - new URL(b).pathname.length);
}

async function fetchPage(url: string): Promise<{ html: string; url: string } | undefined> {
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? { html: await res.text(), url: res.url || url } : undefined;
  } catch {
    return undefined;
  }
}

// The maker's own listing of the product among a page's links, checked by
// fetching each candidate, and one hop further from a maker's page that is
// not the product; undefined when none is the product.
export async function findBrandListing({
  productName,
  company,
  websiteUrl,
  links,
}: {
  productName: string;
  company: string;
  websiteUrl?: string | null;
  links: string[];
}): Promise<BrandListing | undefined> {
  const queue = makerLinks(links, company, websiteUrl).slice(0, MOST_CHECKED);
  const seen = new Set(queue);
  for (let checked = 0; queue.length && checked < MOST_CHECKED + 3; checked++) {
    const page = await fetchPage(queue.shift()!);
    // A redirect off the maker's site (a region picker, a sign-in) is not its
    // listing.
    if (!page || !isMakerHost(new URL(page.url).hostname, company, websiteUrl)) continue;
    const markup = productMarkup(page.html);
    if (markup && isSameProduct(productName, company, markup)) {
      const offer = readOfferMarkup(page.html);
      return { label: markup.brand || company, url: page.url, price: offer.kind === 'price' ? offer.price : undefined };
    }
    const next = productLinksIn(page.html, page.url, productName, company, websiteUrl).filter((u) => !seen.has(u));
    next.slice(0, 3).forEach((u) => seen.add(u));
    queue.unshift(...next.slice(0, 3));
  }
  return undefined;
}
