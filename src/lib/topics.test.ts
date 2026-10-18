import { describe, expect, it } from 'vitest';
import { companyPath, tagPath, topicSlug } from './topics';
import { topicJsonLd } from './seo';
import type { PinJson } from './types';

describe('topicSlug', () => {
  it('slugs a Latin name, accents and ampersands included', () => {
    expect(topicSlug('Anime')).toBe('anime');
    expect(topicSlug('Tokyo Anime Award Festival 2024')).toBe('tokyo-anime-award-festival-2024');
    expect(topicSlug('Aimé Leon Dore')).toBe('aime-leon-dore');
    expect(tagPath("World's 50 Best")).toBe('/tag/world-s-50-best');
    expect(companyPath('Electronic Arts')).toBe('/company/electronic-arts');
  });

  it('keeps a name in another script, so it still has a URL', () => {
    expect(topicSlug('长生骨')).toBe('长生骨');
    expect(topicSlug('魅影 神捕')).toBe('魅影-神捕');
    expect(tagPath('长生骨')).toBe(`/tag/${encodeURIComponent('长生骨')}`);
  });
});

describe('topicJsonLd', () => {
  it('lists the upcoming pins with their dates, and names the company', () => {
    const pins = [{ id: 7, title: 'Zelda Remake Releases', utcStartDateTime: '2026-11-05T00:00:00.000Z', allDay: true, description: 'It comes out.' }] as PinJson[];
    const [page, crumbs] = topicJsonLd({
      name: 'Nintendo',
      path: '/company/nintendo',
      description: 'Upcoming Nintendo dates',
      hub: { name: 'Companies', path: '/companies' },
      company: { logoUrl: null, wikiUrl: 'https://en.wikipedia.org/wiki/Nintendo', websiteUrl: 'https://www.nintendo.com' },
      pins,
    });
    expect(page).toMatchObject({
      '@type': 'CollectionPage',
      about: { '@type': 'Organization', name: 'Nintendo', url: 'https://www.nintendo.com', sameAs: 'https://en.wikipedia.org/wiki/Nintendo' },
      mainEntity: { numberOfItems: 1, itemListElement: [{ position: 1, url: expect.stringMatching(/\/pin\/7\/zelda-remake-releases$/), description: '2026-11-05: It comes out.' }] },
    });
    expect((crumbs as { itemListElement: { item: string }[] }).itemListElement.map((c) => c.item)).toEqual([
      expect.stringMatching(/\/$/),
      expect.stringMatching(/\/companies$/),
      expect.stringMatching(/\/company\/nintendo$/),
    ]);
  });
});
