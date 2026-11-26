import { describe, expect, it } from 'vitest';
import { MAX_OWN_TICKERS, parseTickerInput, readOwnTickers, topWithOwn } from './ownTickers';

describe('parseTickerInput', () => {
  it('takes several symbols, upper-cased, without "$" or repeats', () => {
    expect(parseTickerInput(' $aapl, tsla  AAPL brk.b ')).toEqual({ symbols: ['AAPL', 'TSLA', 'BRK.B'], invalid: false });
  });

  it('flags what is not a symbol and keeps the rest', () => {
    expect(parseTickerInput('AMD 123')).toEqual({ symbols: ['AMD'], invalid: true });
    expect(parseTickerInput('  ')).toEqual({ symbols: [], invalid: false });
  });
});

describe('topWithOwn', () => {
  const ranked = ['A', 'B', 'C', 'D', 'E', 'F'].map((s) => [s] as const);
  const names = (list: readonly (readonly [string])[]) => list.map(([s]) => s).join('');

  it('is the top of the ranking when none of the reader’s sits below it', () => {
    expect(names(topWithOwn(ranked, 3, []))).toBe('ABC');
    expect(names(topWithOwn(ranked, 3, ['B', 'Z']))).toBe('ABC');
    expect(names(topWithOwn(ranked, 10, ['F']))).toBe('ABCDEF');
  });

  it('gives the last places to the reader’s below the cut, keeping the size', () => {
    expect(names(topWithOwn(ranked, 3, ['E']))).toBe('ABE');
    expect(names(topWithOwn(ranked, 3, ['D', 'F']))).toBe('ADF');
    expect(names(topWithOwn(ranked, 3, ['C', 'F']))).toBe('ACF');
  });

  it('grows only when the reader’s alone outnumber the places', () => {
    expect(names(topWithOwn(ranked, 2, ['B', 'D', 'F']))).toBe('BDF');
  });
});

describe('readOwnTickers', () => {
  it('reads a stored list and drops what is not a symbol', () => {
    expect(readOwnTickers('["AAPL", "aapl", 5, "no good", "T"]')).toEqual(['AAPL', 'T']);
  });

  it('reads anything else as an empty list', () => {
    for (const stored of [null, '', '{', '{"a":1}']) expect(readOwnTickers(stored)).toEqual([]);
  });

  it('caps the list', () => {
    const many = Array.from({ length: MAX_OWN_TICKERS + 5 }, (_, i) => `A${i}`);
    expect(readOwnTickers(JSON.stringify(many))).toHaveLength(MAX_OWN_TICKERS);
  });
});
