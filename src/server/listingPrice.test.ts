import { describe, expect, it } from 'vitest';
import { readAmazonPage, readOfferMarkup, readSwappaPage, storeUrlOf, urgencyOf } from './listingPrice';

// Every Amazon product page carries this template, in stock or not.
const TEMPLATE = '<script type="text/template">Currently unavailable.</script>';
const padding = 'x'.repeat(30_000);

describe('readAmazonPage', () => {
  it("reads the buy box of the page's own variant", () => {
    const html = `${padding}<span id="productTitle"> Apple AirPods 5 </span>${TEMPLATE}
      <div class="a-section twister-plus-buying-options-price-data">{"desktop_buybox_group_1":[{"priceAmount":124.99}]}</div>`;
    expect(readAmazonPage(html)).toEqual({ kind: 'price', price: 124.99, title: 'Apple AirPods 5' });
  });

  it('falls back to the lowest new offer when the buy box is left to a script', () => {
    const html = `${padding}<span id="productTitle">Google Pixel Watch 5</span>
      <a id="aod-ingress-link" aria-expanded="false" class="a-link-normal" href="/gp/offer-listing/B0H7WX3DCB/ref=dp_olp_NEW_mbc?ie=UTF8&amp;condition=NEW" role="button">
      <span class="a-color-base">New (3) from</span> <span class="a-price"><span class="a-offscreen">$1,399.99</span></span></a>`;
    expect(readAmazonPage(html)).toEqual({ kind: 'price', price: 1399.99, title: 'Google Pixel Watch 5' });
    expect(readAmazonPage(html.replace('condition=NEW', 'condition=USED')).kind).toBe('unknown');
  });

  it('calls an item unavailable only from its availability line, not the template', () => {
    const inStockNoBox = `${padding}<span id="productTitle">Thing</span>${TEMPLATE}<div id="availability"><span>In Stock</span></div>`;
    expect(readAmazonPage(inStockNoBox).kind).toBe('unknown');
    const gone = `${padding}<span id="productTitle">Thing</span><div id="availability"><style>.a{}</style><span>Currently unavailable.</span></div>`;
    expect(readAmazonPage(gone)).toEqual({ kind: 'unavailable', title: 'Thing' });
  });

  it('treats the small "continue shopping" page as a block, not a missing product', () => {
    expect(readAmazonPage('<title>Amazon.com</title><form action="/errors/validateCaptcha">Continue shopping</form>')).toEqual({
      kind: 'unknown',
      reason: 'robot check',
    });
  });
});

describe('readSwappaPage', () => {
  it("reads the model page's lowest listing, and none left as unavailable", () => {
    const page = (count: number, low: string) =>
      `<title>Google Pixel 9 - Used and Refurbished - Swappa</title><meta itemprop="offerCount" content="${count}" /><meta itemprop="lowPrice" content="${low}" />`;
    expect(readSwappaPage(page(41, '320.00'))).toEqual({ kind: 'price', price: 320, title: 'Google Pixel 9' });
    expect(readSwappaPage(page(0, '0.00'))).toEqual({ kind: 'unavailable', title: 'Google Pixel 9' });
  });
});

describe('readOfferMarkup', () => {
  const ld = (data: object) => `<title>Swatch</title><script type="application/ld+json">${JSON.stringify(data)}</script>`;

  it('reads a dollar Offer from JSON-LD, nested or in a graph', () => {
    expect(readOfferMarkup(ld({ '@type': 'Product', offers: { '@type': 'Offer', price: '570.00', priceCurrency: 'USD' } }))).toMatchObject({ kind: 'price', price: 570 });
    expect(readOfferMarkup(ld({ '@graph': [{ '@type': 'Product', offers: [{ '@type': 'AggregateOffer', lowPrice: 17.99, priceCurrency: 'USD' }] }] }))).toMatchObject({
      kind: 'price',
      price: 17.99,
    });
  });

  it('skips a price in another currency, and reads out of stock', () => {
    expect(readOfferMarkup(ld({ '@type': 'Offer', price: '66000', priceCurrency: 'JPY' })).kind).toBe('unknown');
    expect(readOfferMarkup(ld({ '@type': 'Offer', price: '40', priceCurrency: 'USD', availability: 'https://schema.org/OutOfStock' })).kind).toBe('unavailable');
  });
});

describe('storeUrlOf', () => {
  it("reads through a Rakuten deep link to the store's own page", () => {
    const link = 'https://click.linksynergy.com/deeplink?id=Y1h&mid=24348&murl=https%3A%2F%2Fwww.gamestop.com%2Fproducts%2F352654.html';
    expect(storeUrlOf(link)?.toString()).toBe('https://www.gamestop.com/products/352654.html');
  });
});

const page = (availability: string, rest = '') => `<div id="availability" class="a-section"><span class="a-size-medium">${availability}</span></div>${rest}`;

describe('urgencyOf', () => {
  it('reads the stock Amazon says is left', () => {
    expect(urgencyOf(page('Only 12 left in stock - order soon.'))).toBe('left:12');
  });
  it('reads a lowest-price badge', () => {
    expect(urgencyOf(page('In Stock', '<span>Lowest price in 90 days</span>'))).toBe('low:90');
    expect(urgencyOf(page('In Stock', '<span>90-day low price</span>'))).toBe('low:90');
  });
  it('prefers the stock left to the price badge', () => {
    expect(urgencyOf(page('Only 3 left in stock.', '<span>Lowest price in 30 days</span>'))).toBe('left:3');
  });
  it('says nothing for an ordinary page', () => {
    expect(urgencyOf(page('In Stock'))).toBeNull();
  });
});
