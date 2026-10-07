import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import Anchor from '@/components/ui/Anchor';
import { externalLinkAttributes, relativeSiteHref, relativeSiteUrl } from './siteLinks';
import { safeHtml } from './sanitize';
import { localizePath } from './i18n/config';

describe('same-domain site links', () => {
  it('opens external websites in a protected new tab while preserving other link relations', () => {
    expect(externalLinkAttributes('https://example.com/menu', 'sponsored opener')).toEqual({ target: '_blank', rel: 'sponsored noopener noreferrer' });
    expect(externalLinkAttributes('//example.com/menu').target).toBe('_blank');
    expect(externalLinkAttributes({ protocol: 'https:', host: 'example.com', pathname: '/menu' }).target).toBe('_blank');
    for (const href of ['/pin/1', '#menu', 'https://chronopin.com/pin/1', 'mailto:hello@example.com', 'tel:123']) {
      expect(externalLinkAttributes(href)).toEqual({});
    }
    const external = renderToStaticMarkup(createElement(Anchor, { href: 'https://example.com', target: '_self' }, 'Website'));
    expect(external).toContain('target="_blank"');
    expect(external).toContain('rel="noopener noreferrer"');
  });

  it('keeps external new-tab attributes through HTML sanitization without trusting stored targets', () => {
    expect(safeHtml('<a href="https://example.com" target="_self" rel="opener">Website</a>')).toContain('target="_blank"');
    expect(safeHtml('<a href="https://example.com">Website</a>')).toContain('rel="nofollow ugc noopener noreferrer"');
    expect(safeHtml('<a href="/pin/1" target="_blank">Pin</a>')).not.toContain('target=');
  });

  it('keeps paths, parameters, fragments, and language when removing the site origin', () => {
    for (const origin of ['https://www.chronopin.com', 'http://chronopin.com', '//www.chronopin.com']) {
      expect(relativeSiteUrl(`${origin}/es/pin/6431/santo-poco?q=a%20b#menu`)).toBe('/es/pin/6431/santo-poco?q=a%20b#menu');
    }
    expect(localizePath(relativeSiteUrl('https://chronopin.com/map?fit=results'), 'es')).toBe('/es/map?fit=results');
  });

  it('preserves external websites, email, fragments, and relative paths', () => {
    for (const href of ['https://guide.michelin.com/us/en', 'mailto:contact@chronopin.com', '#menu', '/map?q=pin:1', 'https://chronopin.com.example.org/pin/1', 'https://chronopin.com@evil.example/pin/1', 'https://chronopin.com//evil.example']) {
      expect(relativeSiteUrl(href)).toBe(href);
    }
  });

  it('normalizes Next Link URL objects without losing query values', () => {
    expect(relativeSiteHref({ protocol: 'https:', host: 'www.chronopin.com', pathname: '/map', query: { pin: 6431 }, hash: '#menu' })).toEqual({ pathname: '/map', query: { pin: 6431 }, hash: '#menu' });
    const external = { protocol: 'https:', host: 'example.com', pathname: '/menu' };
    expect(relativeSiteHref(external)).toBe(external);
  });

  it('normalizes plain anchors while preserving their attributes', () => {
    expect(renderToStaticMarkup(createElement(Anchor, { href: 'https://chronopin.com/pin/1#menu', target: '_blank', rel: 'noopener' }, 'Menu'))).toContain('href="/pin/1#menu"');
    expect(renderToStaticMarkup(createElement(Anchor, { href: 'https://example.com/menu' }, 'Menu'))).toContain('href="https://example.com/menu"');
  });

  it('normalizes links in stored pin text without allowing unsafe URLs', () => {
    const html = safeHtml('<a href="https://chronopin.com/pin/1?view=menu#food">Pin</a><a href="javascript:alert(1)">Bad</a>');
    expect(html).toContain('href="/pin/1?view=menu#food"');
    expect(html).not.toContain('javascript:');
  });
});
