import { describe, expect, it } from 'vitest';
import { authoredScore } from './pinSentiment';

describe('authoredScore', () => {
  it('is undefined for a body with no sentiment', () => {
    expect(authoredScore({})).toBeUndefined();
    expect(authoredScore({ sentiment: null, productLine: 'iPhone' })).toBeUndefined();
  });

  it('clamps the score and keeps the product line, "" for none', () => {
    expect(authoredScore({ sentiment: 1.4, productLine: 'iPhone' })).toEqual({ sentiment: 1, product: 'iPhone' });
    expect(authoredScore({ sentiment: '-0.456', productLine: '' })).toEqual({ sentiment: -0.46, product: '' });
  });

  it('leaves the product unread when none is sent', () => {
    expect(authoredScore({ sentiment: 0.3 })).toEqual({ sentiment: 0.3, product: undefined });
  });

  it('names the problem with a sentiment that is not a number', () => {
    expect(authoredScore({ sentiment: 'good' })).toMatch(/must be a number/);
  });
});
