'use strict';

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
const BROWSER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const BATCH = 50;
const ICON_SIZE = 64;
const MAX_ASPECT = 2;

// Resolves [{ id, websiteUrl, logoUrl }], one per company given; either url
// may be null.
export function findLogos(companies) {
  return _wikidata(companies)
    .then(wiki => _mapLimit(companies, 4, company => {
      const fromWiki = wiki[company.id] || {};
      const websiteUrl = company.websiteUrl || fromWiki.websiteUrl || null;
      return _siteIcon(websiteUrl)
        .then(icon => icon || _homePageIcon(websiteUrl))
        .then(icon => ({
          id: company.id,
          websiteUrl,
          logoUrl: icon || fromWiki.logoUrl || null
        }));
    }));
}

export function faviconUrl(websiteUrl) {
  const host = _host(websiteUrl);
  return host && `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${ICON_SIZE}`;
}

function _siteIcon(websiteUrl) {
  const url = faviconUrl(websiteUrl);
  if (!url) {
    return Promise.resolve(null);
  }
  return _fetch(url)
    .then(res => res.arrayBuffer().then(() => res.ok ? url : null))
    .catch(() => null);
}

const ICON_LINK = /<link\b[^>]*\brel\s*=\s*["']?([^"'>]*icon[^"'>]*)["']?[^>]*>/i;
const HREF = /\bhref\s*=\s*["']?([^"'\s>]+)/i;

function _homePageIcon(websiteUrl) {
  if (!_host(websiteUrl)) {
    return Promise.resolve(null);
  }
  return _fetch(websiteUrl, BROWSER_AGENT)
    .then(res => (res.ok ? res.text() : Promise.resolve('')).then(html => {
      const links = [];
      const iconLink = new RegExp(ICON_LINK.source, 'gi');
      let match;
      while ((match = iconLink.exec(html))) {
        const href = HREF.exec(match[0]);
        if (href) {
          links.push({ apple: /apple-touch-icon/i.test(match[1]), href: href[1].replace(/&amp;/g, '&') });
        }
      }
      const base = res.url || websiteUrl;
      const candidates = links.filter(l => l.apple).concat(links.filter(l => !l.apple))
        .map(l => _absolute(l.href, base))
        .concat(_absolute('/favicon.ico', base))
        .filter(Boolean);
      return candidates.reduce((prev, url) => prev.then(found => found || _isImage(url)), Promise.resolve(null));
    }))
    .catch(() => null);
}

function _isImage(url) {
  return _fetch(url, BROWSER_AGENT)
    .then(res => res.arrayBuffer().then(body =>
      res.ok && /^image\//i.test(res.headers.get('content-type') || '') && body.byteLength > 0 ? url : null))
    .catch(() => null);
}

function _absolute(href, base) {
  try {
    const url = new URL(href, base);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch (err) {
    return null;
  }
}

// { [companyId]: { websiteUrl, logoUrl } } for companies with a Wikipedia link.
function _wikidata(companies) {
  const byTitle = {};
  companies.forEach(c => {
    const title = _wikiTitle(c.wikiUrl);
    if (title) {
      (byTitle[title] = byTitle[title] || []).push(c.id);
    }
  });
  const result = {};
  const titles = Object.keys(byTitle);
  if (!titles.length) {
    return Promise.resolve(result);
  }

  return _batched(titles, batch => _getJson('https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2'
    + '&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=' + encodeURIComponent(batch.join('|')))
    .then(json => {
      const query = json.query || {};
      // A page's final title, back to every title that was asked for.
      const asked = {};
      (query.normalized || []).concat(query.redirects || []).forEach(step => {
        asked[step.to] = (asked[step.to] || []).concat(step.from, asked[step.from] || []);
      });
      const pairs = [];
      (query.pages || []).forEach(page => {
        const qid = page.pageprops && page.pageprops.wikibase_item;
        if (qid) {
          [page.title].concat(asked[page.title] || []).forEach(t => pairs.push([t, qid]));
        }
      });
      return pairs;
    }))
    .then(pairs => {
      const qidByTitle = {};
      pairs.forEach(([title, qid]) => { qidByTitle[title] = qid; });
      const qids = Array.from(new Set(Object.values(qidByTitle)));
      return _batched(qids, batch => _getJson('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json'
        + '&props=claims&ids=' + batch.join('|'))
        .then(json => Object.entries(json.entities || {})))
        .then(entries => {
          const claimsByQid = {};
          entries.forEach(([qid, entity]) => { claimsByQid[qid] = entity.claims || {}; });
          return { qidByTitle, claimsByQid };
        });
    })
    .then(({ qidByTitle, claimsByQid }) => {
      const logoFileById = {};
      titles.forEach(title => {
        const claims = claimsByQid[qidByTitle[title]];
        if (!claims) {
          return;
        }
        const websiteUrl = _claimValue(claims.P856);
        const logoFile = _claimValue(claims.P154);
        byTitle[title].forEach(id => {
          result[id] = { websiteUrl: typeof websiteUrl === 'string' ? websiteUrl : null, logoUrl: null };
          if (typeof logoFile === 'string') {
            logoFileById[id] = logoFile;
          }
        });
      });
      return _commonsThumbs(Array.from(new Set(Object.values(logoFileById))))
        .then(thumbs => {
          Object.entries(logoFileById).forEach(([id, file]) => {
            result[id].logoUrl = thumbs[file] || null;
          });
          return result;
        });
    })
    .catch(err => {
      console.log('Company logo Wikidata lookup err:', err.message);
      return result;
    });
}

// { [fileName]: thumbnailUrl } for the squarish files among these.
function _commonsThumbs(files) {
  return _batched(files, batch => _getJson('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2'
    + `&prop=imageinfo&iiprop=url&iiurlwidth=${ICON_SIZE}&titles=` + encodeURIComponent(batch.map(f => 'File:' + f).join('|')))
    .then(json => {
      const query = json.query || {};
      const asked = {};
      (query.normalized || []).forEach(step => { asked[step.to] = step.from; });
      return (query.pages || [])
        .filter(page => page.imageinfo && page.imageinfo[0].thumburl)
        .filter(page => {
          const { thumbwidth: w, thumbheight: h } = page.imageinfo[0];
          return w && h && w / h <= MAX_ASPECT && h / w <= MAX_ASPECT;
        })
        .map(page => [(asked[page.title] || page.title).replace(/^File:/, ''), _stripTracking(page.imageinfo[0].thumburl)]);
    }))
    .then(pairs => Object.fromEntries(pairs));
}

// The current value of a claim: preferred rank, else the latest one without
// an end time (a company's old logos stay listed with one), else the latest.
function _claimValue(claims) {
  const live = (claims || []).filter(c => c.rank !== 'deprecated' && c.mainsnak && c.mainsnak.datavalue);
  const preferred = live.filter(c => c.rank === 'preferred');
  const current = live.filter(c => !(c.qualifiers && c.qualifiers.P582));
  const claim = preferred[0] || current[current.length - 1] || live[live.length - 1];
  return claim && claim.mainsnak.datavalue.value;
}

function _wikiTitle(wikiUrl) {
  try {
    const match = new URL(wikiUrl).pathname.match(/^\/wiki\/(.+)$/);
    return match ? decodeURIComponent(match[1]).replace(/_/g, ' ') : null;
  } catch (err) {
    return null;
  }
}

function _host(websiteUrl) {
  try {
    const host = new URL(/^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`).hostname;
    return host.replace(/^www\./i, '') || null;
  } catch (err) {
    return null;
  }
}

function _stripTracking(url) {
  return url.replace(/\?utm_[^#]*$/, '');
}

function _fetch(url, userAgent) {
  return fetch(url, { headers: { 'User-Agent': userAgent || USER_AGENT }, signal: AbortSignal.timeout(10000) });
}

function _getJson(url) {
  return _fetch(url).then(res => {
    if (!res.ok) {
      throw new Error(`GET ${url} failed with ${res.status}`);
    }
    return res.json();
  });
}

// Runs one request per batch, one after another, and flattens the results.
function _batched(items, run) {
  const batches = [];
  for (let i = 0; i < items.length; i += BATCH) {
    batches.push(items.slice(i, i + BATCH));
  }
  return batches.reduce((prev, batch) => prev.then(all => run(batch).then(part => all.concat(part))), Promise.resolve([]));
}

function _mapLimit(items, limit, run) {
  const results = new Array(items.length);
  let next = 0;
  const worker = () => {
    if (next >= items.length) {
      return Promise.resolve();
    }
    const i = next++;
    return run(items[i]).then(result => { results[i] = result; }).then(worker);
  };
  return Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker)).then(() => results);
}
