// Best-attempt company logos, all from public sources that need no key:
//
//   1. The company website's icon, through Google's favicon service. Square
//      and made for small sizes, which is how the logo is shown (in front of
//      the name). The service answers 404 when a site has no icon.
//   2. Otherwise the icon the site's own home page links to (apple-touch-icon
//      first, as the largest), or its /favicon.ico. Google misses some sites
//      that do have one.
//   3. Otherwise the Wikidata logo image (P154) as a Commons thumbnail, but
//      only a squarish one: most are wide wordmarks that would be unreadable
//      at icon size and only repeat the name beside them.
//
// The website comes from the company row (hand-set) or Wikidata's official
// website (P856), reached from the company's Wikipedia article. Wikimedia
// asks for a descriptive User-Agent and rate-limits anonymous callers, so
// every Wikimedia lookup is batched 50 titles at a time.

const USER_AGENT = 'Chronopin/1.0 (https://chronopin.com; company logo lookup)';
// Company sites, unlike Wikimedia, often turn away anything but a browser.
const BROWSER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const BATCH = 50;
const ICON_SIZE = 64;
const MAX_ASPECT = 2;

type CompanyInput = { id: number; websiteUrl?: string | null; wikiUrl?: string | null };
export type FoundLogo = { id: number; websiteUrl: string | null; logoUrl: string | null };

// Resolves one { id, websiteUrl, logoUrl } per company given; either url may be null.
export async function findLogos(companies: CompanyInput[]): Promise<FoundLogo[]> {
  const wiki = await wikidata(companies);
  return mapLimit(companies, 4, async (company) => {
    const fromWiki = wiki[company.id] || { websiteUrl: null, logoUrl: null };
    const websiteUrl = company.websiteUrl || fromWiki.websiteUrl || null;
    const icon = (await siteIcon(websiteUrl)) || (await homePageIcon(websiteUrl));
    return {
      id: company.id,
      websiteUrl,
      logoUrl: icon || fromWiki.logoUrl || null,
    };
  });
}

export function faviconUrl(websiteUrl: string | null | undefined): string | null {
  const h = host(websiteUrl);
  return h ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=${ICON_SIZE}` : null;
}

async function siteIcon(websiteUrl: string | null) {
  const url = faviconUrl(websiteUrl);
  if (!url) {
    return null;
  }
  try {
    const res = await get(url);
    await res.arrayBuffer();
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

const ICON_LINK = /<link\b[^>]*\brel\s*=\s*["']?([^"'>]*icon[^"'>]*)["']?[^>]*>/i;
const HREF = /\bhref\s*=\s*["']?([^"'\s>]+)/i;

async function homePageIcon(websiteUrl: string | null) {
  if (!websiteUrl || !host(websiteUrl)) {
    return null;
  }
  try {
    const res = await get(websiteUrl, BROWSER_AGENT);
    const html = res.ok ? await res.text() : '';
    const links: { apple: boolean; href: string }[] = [];
    const iconLink = new RegExp(ICON_LINK.source, 'gi');
    let match: RegExpExecArray | null;
    while ((match = iconLink.exec(html))) {
      const href = HREF.exec(match[0]);
      if (href) {
        links.push({ apple: /apple-touch-icon/i.test(match[1]), href: href[1].replace(/&amp;/g, '&') });
      }
    }
    const base = res.url || websiteUrl;
    const candidates = links
      .filter((l) => l.apple)
      .concat(links.filter((l) => !l.apple))
      .map((l) => absolute(l.href, base))
      .concat(absolute('/favicon.ico', base))
      .filter((url): url is string => !!url);
    for (const url of candidates) {
      const found = await isImage(url);
      if (found) {
        return found;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function isImage(url: string) {
  try {
    const res = await get(url, BROWSER_AGENT);
    const body = await res.arrayBuffer();
    return res.ok && /^image\//i.test(res.headers.get('content-type') || '') && body.byteLength > 0 ? url : null;
  } catch {
    return null;
  }
}

function absolute(href: string, base: string) {
  try {
    const url = new URL(href, base);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

type WikiResult = Record<number, { websiteUrl: string | null; logoUrl: string | null }>;

// { [companyId]: { websiteUrl, logoUrl } } for companies with a Wikipedia link.
async function wikidata(companies: CompanyInput[]): Promise<WikiResult> {
  const byTitle: Record<string, number[]> = {};
  companies.forEach((c) => {
    const title = wikiTitle(c.wikiUrl);
    if (title) {
      (byTitle[title] = byTitle[title] || []).push(c.id);
    }
  });
  const result: WikiResult = {};
  const titles = Object.keys(byTitle);
  if (!titles.length) {
    return result;
  }

  try {
    const pairs = await batched(titles, async (batch) => {
      const json = await getJson(
        'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2' +
          '&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=' +
          encodeURIComponent(batch.join('|')),
      );
      const query = json.query || {};
      // A page's final title, back to every title that was asked for.
      const asked: Record<string, string[]> = {};
      (query.normalized || []).concat(query.redirects || []).forEach((step: { from: string; to: string }) => {
        asked[step.to] = (asked[step.to] || []).concat(step.from, asked[step.from] || []);
      });
      const found: [string, string][] = [];
      (query.pages || []).forEach((page: any) => {
        const qid = page.pageprops && page.pageprops.wikibase_item;
        if (qid) {
          [page.title].concat(asked[page.title] || []).forEach((t: string) => found.push([t, qid]));
        }
      });
      return found;
    });

    const qidByTitle: Record<string, string> = {};
    pairs.forEach(([title, qid]) => {
      qidByTitle[title] = qid;
    });
    const qids = Array.from(new Set(Object.values(qidByTitle)));
    const entries = await batched(qids, async (batch) => {
      const json = await getJson(
        'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=' + batch.join('|'),
      );
      return Object.entries(json.entities || {}) as [string, any][];
    });
    const claimsByQid: Record<string, any> = {};
    entries.forEach(([qid, entity]) => {
      claimsByQid[qid] = entity.claims || {};
    });

    const logoFileById: Record<number, string> = {};
    titles.forEach((title) => {
      const claims = claimsByQid[qidByTitle[title]];
      if (!claims) {
        return;
      }
      const websiteUrl = claimValue(claims.P856);
      const logoFile = claimValue(claims.P154);
      byTitle[title].forEach((id) => {
        result[id] = { websiteUrl: typeof websiteUrl === 'string' ? websiteUrl : null, logoUrl: null };
        if (typeof logoFile === 'string') {
          logoFileById[id] = logoFile;
        }
      });
    });

    const thumbs = await commonsThumbs(Array.from(new Set(Object.values(logoFileById))));
    Object.entries(logoFileById).forEach(([id, file]) => {
      result[Number(id)].logoUrl = thumbs[file] || null;
    });
    return result;
  } catch (err) {
    console.log('Company logo Wikidata lookup err:', (err as Error).message);
    return result;
  }
}

// { [fileName]: thumbnailUrl } for the squarish files among these.
async function commonsThumbs(files: string[]): Promise<Record<string, string>> {
  const pairs = await batched(files, async (batch) => {
    const json = await getJson(
      'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2' +
        `&prop=imageinfo&iiprop=url&iiurlwidth=${ICON_SIZE}&titles=` +
        encodeURIComponent(batch.map((f) => 'File:' + f).join('|')),
    );
    const query = json.query || {};
    const asked: Record<string, string> = {};
    (query.normalized || []).forEach((step: { from: string; to: string }) => {
      asked[step.to] = step.from;
    });
    return (query.pages || [])
      .filter((page: any) => page.imageinfo && page.imageinfo[0].thumburl)
      .filter((page: any) => {
        const { thumbwidth: w, thumbheight: h } = page.imageinfo[0];
        return w && h && w / h <= MAX_ASPECT && h / w <= MAX_ASPECT;
      })
      .map((page: any) => [
        (asked[page.title] || page.title).replace(/^File:/, ''),
        stripTracking(page.imageinfo[0].thumburl),
      ]) as [string, string][];
  });
  return Object.fromEntries(pairs);
}

// The current value of a claim: preferred rank, else the latest one without
// an end time (a company's old logos stay listed with one), else the latest.
function claimValue(claims: any[] | undefined) {
  const live = (claims || []).filter((c) => c.rank !== 'deprecated' && c.mainsnak && c.mainsnak.datavalue);
  const preferred = live.filter((c) => c.rank === 'preferred');
  const current = live.filter((c) => !(c.qualifiers && c.qualifiers.P582));
  const claim = preferred[0] || current[current.length - 1] || live[live.length - 1];
  return claim && claim.mainsnak.datavalue.value;
}

function wikiTitle(wikiUrl: string | null | undefined) {
  if (!wikiUrl) {
    return null;
  }
  try {
    const match = new URL(wikiUrl).pathname.match(/^\/wiki\/(.+)$/);
    return match ? decodeURIComponent(match[1]).replace(/_/g, ' ') : null;
  } catch {
    return null;
  }
}

function host(websiteUrl: string | null | undefined) {
  if (!websiteUrl) {
    return null;
  }
  try {
    const h = new URL(/^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`).hostname;
    return h.replace(/^www\./i, '') || null;
  } catch {
    return null;
  }
}

function stripTracking(url: string) {
  return url.replace(/\?utm_[^#]*$/, '');
}

function get(url: string, userAgent?: string) {
  return fetch(url, { headers: { 'User-Agent': userAgent || USER_AGENT }, signal: AbortSignal.timeout(10000) });
}

async function getJson(url: string): Promise<any> {
  const res = await get(url);
  if (!res.ok) {
    throw new Error(`GET ${url} failed with ${res.status}`);
  }
  return res.json();
}

// Runs one request per batch, one after another, and flattens the results.
async function batched<T, R>(items: T[], run: (batch: T[]) => Promise<R[]>): Promise<R[]> {
  let all: R[] = [];
  for (let i = 0; i < items.length; i += BATCH) {
    all = all.concat(await run(items.slice(i, i + BATCH)));
  }
  return all;
}

async function mapLimit<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await run(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
