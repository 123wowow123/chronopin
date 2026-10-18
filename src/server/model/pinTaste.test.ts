import { describe, expect, it } from 'vitest';
import { hasTaste, isTasteScore } from '@/lib/pinTaste';
import { tasteProblem } from './pinTaste';

const scores = { aroma: 4, bitterness: 2.5, sweetness: 4, astringency: 3, umami: 4, pungent: 1.5, coolness: 0 };

describe('isTasteScore', () => {
  it('takes 0 to 5 in half steps and nothing else', () => {
    for (const ok of [0, 0.5, 3, 4.5, 5]) expect(isTasteScore(ok)).toBe(true);
    for (const bad of [-1, 5.5, 3.3, NaN, '4', null, undefined]) expect(isTasteScore(bad)).toBe(false);
  });
});

describe('hasTaste', () => {
  it('needs all seven axes', () => {
    expect(hasTaste(scores)).toBe(true);
    expect(hasTaste({ ...scores, umami: undefined as unknown as number })).toBe(false);
    expect(hasTaste({ ...scores, coolness: undefined as unknown as number })).toBe(false);
    expect(hasTaste(null)).toBe(false);
  });
});

describe('tasteProblem', () => {
  it('reads the seven scores, the source and the basis', () => {
    expect(tasteProblem({ ...scores, source: 'session', basis: ' Citrus and malt notes. ', sourceUrl: 'https://example.com/tasting' })).toEqual({
      scores,
      abv: null,
      abvSourceUrl: null,
      reviews: [],
      source: 'session',
      basis: 'Citrus and malt notes.',
      sourceUrl: 'https://example.com/tasting',
    });
  });

  it('takes an ABV with up to two decimals, and none', () => {
    expect(tasteProblem({ ...scores, abv: 10.25 })).toMatchObject({ abv: 10.25 });
    expect(tasteProblem(scores)).toMatchObject({ abv: null });
    expect(tasteProblem({ ...scores, abv: null })).toMatchObject({ abv: null });
    expect(tasteProblem({ ...scores, abv: 4.5, abvSourceUrl: 'https://example.com/a' })).toMatchObject({ abvSourceUrl: 'https://example.com/a' });
    // A source for a figure that is not there is dropped; a bad one is refused.
    expect(tasteProblem({ ...scores, abvSourceUrl: 'https://example.com/a' })).toMatchObject({ abv: null, abvSourceUrl: null });
    expect(tasteProblem({ ...scores, abv: 4.5, abvSourceUrl: 'ftp://x' })).toMatch(/abvSourceUrl is not a web address/);
    expect(tasteProblem({ ...scores, abv: 101 })).toMatch(/abv must be a percentage/);
    expect(tasteProblem({ ...scores, abv: 6.123 })).toMatch(/abv must be a percentage/);
    expect(tasteProblem({ ...scores, abv: '6.5' })).toMatch(/abv must be a percentage/);
  });

  it('keeps tasting reviews, once each, and refuses a bad one', () => {
    const review = { url: 'https://example.com/r', title: 'Tried it', publishedDate: '2026-09-30', quote: 'Sweet and nutty.' };
    expect(tasteProblem({ ...scores, reviews: [review, review] })).toMatchObject({ reviews: [review] });
    expect(tasteProblem({ ...scores, reviews: [{ url: 'https://example.com/r' }] })).toMatchObject({
      reviews: [{ url: 'https://example.com/r', title: null, publishedDate: null, quote: null }],
    });
    expect(tasteProblem({ ...scores, reviews: [{ url: 'javascript:1' }] })).toMatch(/needs an http/);
    expect(tasteProblem({ ...scores, reviews: [{ ...review, publishedDate: '30/09/2026' }] })).toMatch(/YYYY-MM-DD/);
    expect(tasteProblem({ ...scores, reviews: [{ ...review, quote: 'x'.repeat(401) }] })).toMatch(/quote is a string/);
    expect(tasteProblem({ ...scores, reviews: Array.from({ length: 7 }, (_, i) => ({ url: `https://example.com/${i}` })) })).toMatch(/at most 6/);
  });

  it('defaults to a hand row', () => {
    const checked = tasteProblem(scores);
    expect(typeof checked === 'object' && checked.source).toBe('hand');
  });

  it('names the axis that is wrong', () => {
    expect(tasteProblem({ ...scores, umami: 6 })).toMatch(/umami must be a number from 0 to 5/);
    expect(tasteProblem({ ...scores, aroma: undefined })).toMatch(/aroma/);
    expect(tasteProblem({ ...scores, pungent: 5.5 })).toMatch(/pungent must be a number/);
  });

  it('refuses an unknown source and a source link that is not a web address', () => {
    expect(tasteProblem({ ...scores, source: 'steam' })).toMatch(/source must be one of/);
    expect(tasteProblem({ ...scores, sourceUrl: 'javascript:alert(1)' })).toMatch(/not a web address/);
  });
});
