import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import Anchor from '@/components/ui/Anchor';
import { relativeSiteHref, relativeSiteUrl } from './siteLinks';
import { safeHtml } from './sanitize';
import { localizePath } from './i18n/config';

describe('same-domain site links', () => {
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
