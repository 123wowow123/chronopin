import { describe, expect, it } from 'vitest';
import { amazonAssociateTag } from './affiliate';
import { shopLinks, withoutTracking } from './shopping';
import type { PinJson } from './types';

const sneaker = {
  productName: 'PUMA MB.06 Puerto Rico',
  categories: ['Fashion', 'Sports'],
  tags: [{ name: 'Sneakers', kind: 'topic', source: 'user' }],
} as Pick<PinJson, 'productName' | 'merchants' | 'tags' | 'categories'>;

describe('shopLinks', () => {
  it("searches the vertical's stores first, then the marketplaces, Amazon tagged", () => {
    const links = shopLinks(sneaker);
    expect(links.map((l) => l.store)).toEqual(['StockX', 'GOAT', 'Amazon', 'eBay', 'Mercari', 'Facebook Marketplace']);
    expect(links.every((l) => l.search)).toBe(true);
    expect(links[0].url).toBe('https://stockx.com/search?s=PUMA%20MB.06%20Puerto%20Rico');
    const amazon = links.find((l) => l.store === 'Amazon')!;
    expect(amazon.amazon).toBe(true);
    expect(new URL(amazon.url).searchParams.get('tag')).toBe(amazonAssociateTag);
    expect(new URL(amazon.url).searchParams.get('k')).toBe('PUMA MB.06 Puerto Rico');
  });

  it("puts a stored listing first, without its ad tracking, in place of that store's search", () => {
    const links = shopLinks({
      ...sneaker,
      merchants: [
        {
          label: 'StockX',
          url: 'https://stockx.com/puma-lamelo-ball-mb06-puerto-rico?country=US&size=11.5&utm_source=google&utm_medium=cpc&gad_source=1&gbraid=0AAA&gclid=Cj0',
          price: 125,
        },
      ],
    });
    expect(links[0]).toEqual({ store: 'StockX', url: 'https://stockx.com/puma-lamelo-ball-mb06-puerto-rico?country=US&size=11.5', price: 125, search: false, amazon: false });
    expect(links.filter((l) => l.store === 'StockX')).toHaveLength(1);
  });

  it('offers electronics stores for a gadget, and nothing without a product or listing', () => {
    expect(shopLinks({ productName: 'Sony WH-1000XM6', categories: ['Audio'] }).slice(0, 2).map((l) => l.store)).toEqual(['Back Market', 'Swappa']);
    expect(shopLinks({ categories: ['Fashion'] })).toEqual([]);
  });

  it('leaves streaming services and dropped stores to the rest of the page', () => {
    const links = shopLinks({
      merchants: [
        { label: 'Netflix', url: 'https://www.netflix.com/title/81234567' },
        { label: 'Best Buy', url: 'https://www.bestbuy.com/site/x' },
        { label: 'GameStop', url: 'https://click.linksynergy.com/deeplink?id=Y1h47rHzgYg&murl=x' },
      ],
    });
    expect(links.map((l) => l.store)).toEqual(['GameStop']);
  });
});

describe('withoutTracking', () => {
  it('keeps a link with no tracking exactly as it is', () => {
    expect(withoutTracking('https://www.goat.com/sneakers/x?size=10')).toBe('https://www.goat.com/sneakers/x?size=10');
    expect(withoutTracking('not a url')).toBe('not a url');
  });
});
