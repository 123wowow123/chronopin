// Landing pages whose human visits are counted (LandingVisit, 0138) and the
// referrer source a visit is filed under. Only restaurants for now.

export function isLandingPath(path: string): boolean {
  return path === '/restaurants' || path.startsWith('/restaurants/');
}

const SEARCH: [RegExp, string][] = [
  [/(^|\.)google\./, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)yahoo\./, 'Yahoo'],
  [/(^|\.)ecosia\.org$/, 'Ecosia'],
  [/(^|\.)yandex\./, 'Yandex'],
  [/(^|\.)baidu\.com$/, 'Baidu'],
  [/(^|\.)(chatgpt|openai)\.com$/, 'ChatGPT'],
  [/(^|\.)perplexity\.ai$/, 'Perplexity'],
  [/(^|\.)(facebook|fb)\.com$|(^|\.)l\.facebook\.com$/, 'Facebook'],
  [/(^|\.)(twitter|x)\.com$|^t\.co$/, 'X'],
  [/(^|\.)reddit\.com$/, 'Reddit'],
];

// "direct" with no referrer, "internal" from the site's own host, a known
// search or social site by name, else the referring host without "www.".
export function referrerSource(referer: string | null, ownHost: string): string {
  if (!referer) return 'direct';
  let host: string;
  try {
    host = new URL(referer).hostname.toLowerCase();
  } catch {
    return 'direct';
  }
  const strip = (h: string) => h.replace(/^www\./, '');
  if (strip(host) === strip(ownHost.split(':')[0].toLowerCase())) return 'internal';
  for (const [re, name] of SEARCH) if (re.test(host)) return name;
  return strip(host).slice(0, 120);
}

// The landing page a referrer URL is, as its English path, else null. Only
// the site's own host counts: a pin opened from the guide on another site is
// not a click on it.
export function landingReferrerPath(referer: string | null, ownHost: string, stripLocale: (p: string) => string): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    const strip = (h: string) => h.replace(/^www\./, '').toLowerCase();
    if (strip(url.hostname) !== strip(ownHost.split(':')[0])) return null;
    const path = stripLocale(url.pathname).replace(/(.)\/$/, '$1');
    return isLandingPath(path) ? path : null;
  } catch {
    return null;
  }
}

// The pin id in a pin page's path (/pin/12/slug), else null.
export function pinIdOfPath(path: string): number | null {
  const match = /^\/pin\/(\d+)(?:\/|$)/.exec(path);
  return match ? Number(match[1]) : null;
}

// A browser reload revalidates its page, which a link click does not: Chrome,
// Firefox and Safari send Cache-Control: max-age=0 (or no-cache on a hard
// reload). Not proof - a script can send either - but it is what a person
// pressing reload sends.
export function isReload(cacheControl: string | null, pragma: string | null): boolean {
  return /(?:^|,)\s*(?:max-age=0|no-cache)\b/i.test(cacheControl ?? '') || /no-cache/i.test(pragma ?? '');
}
