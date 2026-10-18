import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ebay = { clientID: 'id', clientSecret: 'secret', campaignID: '' };
vi.mock('./config', () => ({ default: { ebay } }));

type Call = { url: string; init: RequestInit };

function fakeEbay(items: object[]) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.includes('/oauth2/token')) return Response.json({ access_token: 'tok', expires_in: 7200 });
      return Response.json({ itemSummaries: items });
    }),
  );
  return calls;
}

const load = () => import('./ebay');

describe('exactListing', () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as any).__chronopinEbay;
    Object.assign(ebay, { clientID: 'id', clientSecret: 'secret', campaignID: '' });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("answers with the cheapest new, buy-it-now listing whose title is the product", async () => {
    const calls = fakeEbay([
      { title: 'Case for Google Pixel Watch 5', price: { value: '12.99', currency: 'USD' }, itemWebUrl: 'https://www.ebay.com/itm/1' },
      { title: 'Google Pixel Watch 5 45mm Obsidian NEW', price: { value: '379.00', currency: 'USD' }, itemWebUrl: 'https://www.ebay.com/itm/2' },
      { title: 'Google Pixel Watch 5 41mm Sealed', price: { value: '349.95', currency: 'USD' }, itemWebUrl: 'https://www.ebay.com/itm/3' },
    ]);
    const { exactListing } = await load();
    expect(await exactListing('Google Pixel Watch 5')).toEqual({
      store: 'eBay',
      title: 'Google Pixel Watch 5 41mm Sealed',
      price: 349.95,
      currency: 'USD',
      url: 'https://www.ebay.com/itm/3',
    });
    const search = new URL(calls[1].url);
    expect(search.searchParams.get('q')).toBe('Google Pixel Watch 5');
    expect(search.searchParams.get('filter')).toContain('buyingOptions:{FIXED_PRICE}');
    expect(search.searchParams.get('filter')).toContain('conditionIds:{1000|1500}');
    expect((calls[1].init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('asks eBay once an hour per product, token included', async () => {
    const calls = fakeEbay([]);
    const { exactListing } = await load();
    expect(await exactListing('Nintendo Switch 2')).toBeNull();
    expect(await exactListing('nintendo switch 2 ')).toBeNull();
    await exactListing('Steam Deck OLED');
    expect(calls.filter((c) => c.url.includes('/oauth2/token'))).toHaveLength(1);
    expect(calls.filter((c) => c.url.includes('/item_summary/search'))).toHaveLength(2);
  });

  it("links through the Partner Network campaign when there is one", async () => {
    ebay.campaignID = '5338';
    const calls = fakeEbay([
      {
        title: 'Nintendo Switch 2 Console',
        price: { value: '449.99', currency: 'USD' },
        itemWebUrl: 'https://www.ebay.com/itm/9',
        itemAffiliateWebUrl: 'https://www.ebay.com/itm/9?campid=5338',
      },
    ]);
    const { exactListing } = await load();
    expect((await exactListing('Nintendo Switch 2'))?.url).toBe('https://www.ebay.com/itm/9?campid=5338');
    expect((calls[1].init.headers as Record<string, string>)['X-EBAY-C-ENDUSERCTX']).toBe('affiliateCampaignId=5338');
  });

  it('asks nothing without keys', async () => {
    ebay.clientID = '';
    const calls = fakeEbay([]);
    const { exactListing } = await load();
    expect(await exactListing('Nintendo Switch 2')).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
