import { describe, expect, it } from 'vitest';
import { amazonAssociateTag } from './affiliate';
import { cheapestExact, isExactListing, shopLinks, withMatches, withoutTracking } from './shopping';
import type { PinJson } from './types';

const sneaker = {
  productName: 'PUMA MB.06 Puerto Rico',
  categories: ['Fashion', 'Sports'],
  tags: [{ name: 'Sneakers', kind: 'topic', source: 'user' }],
} as Pick<PinJson, 'productName' | 'merchants' | 'tags' | 'categories'>;

describe('shopLinks', () => {
  it("searches the vertical's stores first, then the marketplaces, Amazon tagged", () => {
    const links = shopLinks(sneaker);
    expect(links.map((l) => l.store)).toEqual(['StockX', 'GOAT', 'Amazon', 'eBay', 'Mercari', 'Facebook']);
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
    expect(links[0]).toEqual({ store: 'StockX', url: 'https://stockx.com/puma-lamelo-ball-mb06-puerto-rico?country=US&size=11.5', price: 125, search: false, amazon: false, background: '#006340', text: '#ffffff' });
    expect(links.filter((l) => l.store === 'StockX')).toHaveLength(1);
  });

  it('offers electronics stores for a gadget, and nothing without a product or listing', () => {
    expect(shopLinks({ productName: 'Sony WH-1000XM6', categories: ['Audio'] }).slice(0, 2).map((l) => l.store)).toEqual(['Back Market', 'Swappa']);
    expect(shopLinks({ categories: ['Fashion'] })).toEqual([]);
  });

  it('offers StockX for a limited drop, once when it is also a sneaker', () => {
    const drop = { productName: 'Supreme Nike Faux Fur Reversible Parka FW26', tags: [{ name: 'Drops', kind: 'topic', source: 'user' }] } as Pick<PinJson, 'productName' | 'tags'>;
    expect(shopLinks(drop).map((l) => l.store)).toEqual(['StockX', 'Amazon', 'eBay', 'Mercari', 'Facebook']);
    expect(shopLinks({ ...sneaker, tags: [...sneaker.tags!, ...drop.tags!] }).filter((l) => l.store === 'StockX')).toHaveLength(1);
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

describe('isExactListing', () => {
  it('takes a title with every word of the product, extra size and colour words allowed', () => {
    expect(isExactListing('Google Pixel Watch 5', 'NEW Google Pixel Watch 5 45mm Wi-Fi Matte Black Sealed')).toBe(true);
    expect(isExactListing('PUMA MB.06 Puerto Rico', 'Puma LaMelo Ball MB.06 "Puerto Rico" Men\'s Size 11')).toBe(true);
    expect(isExactListing('Pokémon Legends: Z-A', 'Pokemon Legends Z-A Nintendo Switch 2')).toBe(true);
  });

  it('refuses another model, an accessory for the product, or part of it', () => {
    expect(isExactListing('Google Pixel Watch 5', 'Google Pixel Watch 4 41mm')).toBe(false);
    expect(isExactListing('Google Pixel Watch 5', 'Case for Google Pixel Watch 5 Tempered Glass')).toBe(false);
    expect(isExactListing('Google Pixel Watch 5', 'Google Pixel Watch 5 Sport Band')).toBe(false);
    expect(isExactListing('Nintendo Switch 2', 'Nintendo Switch 2 EMPTY BOX only')).toBe(false);
    expect(isExactListing('Nintendo Switch 2', 'Nintendo Switch 2 for parts not working')).toBe(false);
  });

  it("lets an accessory word through when it is in the product's own name", () => {
    expect(isExactListing('Apple AirPods Pro 3 Charging Case', 'Apple AirPods Pro 3 Charging Case USB-C')).toBe(true);
  });
});

describe('cheapestExact', () => {
  it('takes the cheapest exact listing, past any priced under half the middle one', () => {
    const best = cheapestExact('Nintendo Switch 2', [
      { title: 'Nintendo Switch 2 Console', price: 489 },
      { title: 'Nintendo Switch 2 Console Mario Kart', price: 529 },
      { title: 'Nintendo Switch 2 Carrying Case', price: 19 },
      { title: 'Nintendo Switch 2 Console (read)', price: 120 },
      { title: 'Nintendo Switch 2 System', price: 455 },
      { title: 'Nintendo Switch Lite', price: 150 },
    ]);
    expect(best).toEqual({ title: 'Nintendo Switch 2 System', price: 455 });
  });

  it('finds nothing when no title is the product', () => {
    expect(cheapestExact('Nintendo Switch 2', [{ title: 'Nintendo Switch OLED', price: 300 }])).toBeUndefined();
  });
});

describe('withMatches', () => {
  it("puts a live listing and its price in place of that store's search, and leaves the rest", () => {
    const links = withMatches(shopLinks(sneaker), [
      { store: 'eBay', url: 'https://www.ebay.com/itm/123', price: 112.5, currency: 'USD', title: 'PUMA MB.06 Puerto Rico' },
    ]);
    const ebay = links.find((l) => l.store === 'eBay')!;
    // The live listing earns too: our EPN campaign is on its link.
    expect(ebay).toMatchObject({ price: 112.5, currency: 'USD', search: false, ebay: true });
    expect(new URL(ebay.url).pathname).toBe('/itm/123');
    expect(new URL(ebay.url).searchParams.get('campid')).toBe('5338380156');
    expect(links.filter((l) => l.search).map((l) => l.store)).toEqual(['StockX', 'GOAT', 'Amazon', 'Mercari', 'Facebook']);
  });
});

describe('shopLinks for a game', () => {
  it("shows a stored Steam page in Steam's colours, with no product name needed", () => {
    const links = shopLinks({ categories: ['Gaming'], merchants: [{ label: 'Steam', url: 'https://store.steampowered.com/app/3669200/' }] });
    expect(links).toEqual([
      { store: 'Steam', url: 'https://store.steampowered.com/app/3669200/', price: undefined, search: false, amazon: false, background: '#1b2838', text: '#ffffff', border: '#66c0f4' },
    ]);
  });
});
