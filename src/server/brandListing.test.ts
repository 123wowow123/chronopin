import { describe, expect, it } from 'vitest';
import { isMakerHost, isSameProduct, makerLinks, nameSlugs, productLinksIn, productMarkup, siteDomain, unwrapLink } from './brandListing';

describe('siteDomain', () => {
  it('keeps the registrable domain', () => {
    expect(siteDomain('https://eu.puma.com/de/en/home')).toBe('puma.com');
    expect(siteDomain('https://www.sony.co.in/')).toBe('sony.co.in');
    expect(siteDomain(null)).toBeUndefined();
  });
});

describe('isMakerHost', () => {
  it("takes the website's domain, or a host named after the company", () => {
    expect(isMakerHost('us.puma.com', 'Puma', 'https://eu.puma.com/de/en/home')).toBe(true);
    expect(isMakerHost('www.newbalance.com', 'New Balance', null)).toBe(true);
    expect(isMakerHost('www.footlocker.com', 'Puma', 'https://eu.puma.com/')).toBe(false);
    // A name inside a longer label is not the company's site.
    expect(isMakerHost('www.pumashop.example.com', 'Puma', null)).toBe(false);
  });
});

describe('unwrapLink', () => {
  it('follows affiliate redirects to the store page', () => {
    expect(unwrapLink('https://go.redirectingat.com/?id=1&url=https%3A%2F%2Fus.puma.com%2Fus%2Fen%2Fpd%2Fmb06%2F313624&sref=x')).toBe(
      'https://us.puma.com/us/en/pd/mb06/313624',
    );
    expect(unwrapLink('https://prf.hn/click/camref:1/destination:https%3A%2F%2Fwww.nike.com%2Ft%2Fair-max%2FDZ1234')).toBe(
      'https://www.nike.com/t/air-max/DZ1234',
    );
    expect(unwrapLink('mailto:someone@example.com')).toBeUndefined();
  });
});

describe('makerLinks', () => {
  it("keeps the maker's links, product pages first", () => {
    const links = [
      'https://us.puma.com/us/en/sport/basketball',
      'https://www.footlocker.com/product/puma-mb06/313624.html',
      'https://us.puma.com/us/en/pd/mb06-shooting-star-basketball-shoes/313624',
      'https://us.puma.com/',
      'https://us.puma.com/us/en/pd/mb06-shooting-star-basketball-shoes/313624#reviews',
    ];
    expect(makerLinks(links, 'Puma', 'https://eu.puma.com/de/en/home')).toEqual([
      'https://us.puma.com/us/en/pd/mb06-shooting-star-basketball-shoes/313624',
      'https://us.puma.com/us/en/sport/basketball',
    ]);
  });
});

const page = (markup: object) => `<html><script type="application/ld+json">${JSON.stringify(markup)}</script></html>`;

describe('productMarkup', () => {
  it('reads the Product, inside a graph or not', () => {
    const product = { '@type': 'Product', name: 'MB.06 Shooting Star Basketball Shoes', color: 'Dark Amethyst-Lavender Alert', brand: { '@type': 'Brand', name: 'PUMA' } };
    expect(productMarkup(page(product))).toEqual({ name: 'MB.06 Shooting Star Basketball Shoes', brand: 'PUMA', color: 'Dark Amethyst-Lavender Alert' });
    expect(productMarkup(page({ '@graph': [{ '@type': 'WebPage', name: 'x' }, product] }))?.name).toBe('MB.06 Shooting Star Basketball Shoes');
    expect(productMarkup(page({ '@type': 'NewsArticle', name: 'MB.06 review' }))).toBeUndefined();
  });
});

describe('isSameProduct', () => {
  const markup = { name: 'MB.06 Shooting Star Basketball Shoes', brand: 'PUMA', color: 'Dark Amethyst-Lavender Alert' };
  it('counts the brand beside the name', () => {
    expect(isSameProduct('PUMA MB.06 Shooting Star', 'Puma', markup)).toBe(true);
  });
  it('refuses another colorway of the model', () => {
    expect(isSameProduct('PUMA MB.06 Puerto Rico', 'Puma', markup)).toBe(false);
  });
});

describe('productLinksIn', () => {
  it("follows a collection page to the product's own links, shortest first", () => {
    expect(nameSlugs('PUMA MB.06 \u201cShooting Star\u201d', 'Puma')).toEqual(['mb06', 'shooting', 'star']);
    const html = `
      <a href="/us/en/pd/mb06-shooting-star-big-kids-basketball-shoes/313874?swatch=01">kids</a>
      <a href="/us/en/pd/mb05-lo-team-basketball-shoes/313266?swatch=01">mb05</a>
      <a href="/us/en/pd/mb06-shooting-star-basketball-shoes/313624?swatch=01">adult</a>
      <a href="https://www.footlocker.com/product/mb06-shooting-star/313624.html">reseller</a>`;
    expect(productLinksIn(html, 'https://us.puma.com/us/en/sport/basketball/mb', 'PUMA MB.06 Shooting Star', 'Puma', null)).toEqual([
      'https://us.puma.com/us/en/pd/mb06-shooting-star-basketball-shoes/313624?swatch=01',
      'https://us.puma.com/us/en/pd/mb06-shooting-star-big-kids-basketball-shoes/313874?swatch=01',
    ]);
  });
});
