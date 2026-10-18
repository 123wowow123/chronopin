import { describe, expect, it } from 'vitest';
import { creativeProblem, dollars, packageFor, perThousand, SPONSORED_PACKAGES } from './sponsoredAds';

describe('packages', () => {
  it('sells 1,000 views for $5 and 5,000 for $10', () => {
    expect(packageFor(1000)).toEqual({ impressions: 1000, priceCents: 500 });
    expect(packageFor('5000')).toEqual({ impressions: 5000, priceCents: 1000 });
    expect(packageFor(2000)).toBeNull();
    expect(packageFor(9000)).toBeNull();
    expect(SPONSORED_PACKAGES.map((p) => dollars(p.priceCents))).toEqual(['$5', '$10']);
    expect(perThousand(SPONSORED_PACKAGES[1])).toBe('$2');
  });
});

describe('custom sizes', () => {
  it('start at 10,000 impressions in steps of 1,000 at $1.75 per 1,000', () => {
    expect(packageFor(10000)).toEqual({ impressions: 10000, priceCents: 1750 });
    expect(packageFor(25000)).toEqual({ impressions: 25000, priceCents: 4375 });
    expect(packageFor(1000000)).toEqual({ impressions: 1000000, priceCents: 175000 });
    expect(dollars(1750)).toBe('$17.50');
    expect(packageFor(10500)).toBeNull();
    expect(packageFor(1001000)).toBeNull();
    expect(packageFor('abc')).toBeNull();
  });
});

describe('creativeProblem', () => {
  const ok = { title: 'Fresh bagels', body: 'Open daily', url: 'https://example.com/menu' };
  it('accepts a normal ad', () => expect(creativeProblem(ok)).toBeNull());
  it('needs a headline and a public https link', () => {
    expect(creativeProblem({ ...ok, title: ' ' })).toMatch(/headline/);
    expect(creativeProblem({ ...ok, url: 'http://example.com' })).toMatch(/https/);
    expect(creativeProblem({ ...ok, url: 'https://localhost/x' })).toMatch(/public/);
    expect(creativeProblem({ ...ok, url: 'https://10.0.0.1/x' })).toMatch(/public/);
    expect(creativeProblem({ ...ok, url: 'https://user:pw@example.com' })).toMatch(/username/);
    expect(creativeProblem({ ...ok, url: 'javascript:alert(1)' })).toMatch(/https/);
  });
  it('limits the lengths', () => {
    expect(creativeProblem({ ...ok, title: 'x'.repeat(61) })).toMatch(/60/);
    expect(creativeProblem({ ...ok, body: 'x'.repeat(141) })).toMatch(/140/);
  });
});
