import { siteUrl } from './appConfig';
import type { UrlObject } from 'url';

const siteHosts = new Set(['chronopin.com', 'www.chronopin.com', new URL(siteUrl).hostname]);

export function externalLinkAttributes(href: string | UrlObject | null | undefined, rel?: string): { target?: '_blank'; rel?: string } {
  if (!href) return {};
  const relative = relativeSiteHref(href);
  const external = typeof relative === 'string'
    ? /^(https?:)?\/\//i.test(relative.trim())
    : Boolean(relative.host || relative.hostname || /^(https?:)?\/\//i.test(relative.pathname || ''));
  if (!external) return {};
  const tokens = new Set((rel || '').split(/\s+/).filter((token) => token && token.toLowerCase() !== 'opener'));
  tokens.add('noopener');
  tokens.add('noreferrer');
  return { target: '_blank', rel: [...tokens].join(' ') };
}

// Internal links follow the domain serving the page, including local previews.
export function relativeSiteUrl(href: string): string {
  if (!/^(https?:)?\/\//i.test(href)) return href;
  try {
    const url = new URL(href, siteUrl);
    if (!siteHosts.has(url.hostname) || url.username || url.password || url.pathname.startsWith('//')) return href;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

export function relativeSiteHref(href: string | UrlObject): string | UrlObject {
  if (typeof href === 'string') return relativeSiteUrl(href);
  const host = href.host ?? (href.hostname ? `${href.hostname}${href.port ? `:${href.port}` : ''}` : null);
  if (!host || href.auth) return href;
  const origin = `${href.protocol ?? 'https:'}//${host}/`;
  if (relativeSiteUrl(origin) !== '/' || href.pathname?.startsWith('//')) return href;
  const relative = { ...href, pathname: href.pathname || '/' };
  delete relative.host;
  delete relative.hostname;
  delete relative.protocol;
  delete relative.port;
  delete relative.slashes;
  return relative;
}
