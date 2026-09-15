import { describe, expect, it } from 'vitest';
import { batchOf, freshReferences } from './select';

describe('batchOf', () => {
  it('splits rows round-robin without losing or repeating any', () => {
    const rows = [1, 2, 3, 4, 5, 6, 7];
    const batches = [0, 1, 2].map((b) => batchOf(rows, b, 3));
    expect(batches).toEqual([[1, 4, 7], [2, 5], [3, 6]]);
  });
});

describe('freshReferences', () => {
  const ref = (url: string, confidence = 80, extra = {}) => ({ url, title: 'T', confidence, publishedDate: '2013-11-12', ...extra });

  it('drops the source, existing references and duplicates, however the url is written', () => {
    const out = freshReferences(
      [ref('https://www.example.com/source/'), ref('https://old.com/a#top'), ref('https://new.com/a'), ref('https://new.com/a/', 90)],
      ['https://old.com/a'],
      'https://example.com/source',
    );
    expect(out.map((r) => r.url)).toEqual(['https://new.com/a']);
  });

  it('keeps only confidence 70-100, strongest first', () => {
    const out = freshReferences([ref('https://a.com', 69), ref('https://b.com', 75), ref('https://c.com', 95), ref('https://d.com', 101)], [], null);
    expect(out.map((r) => r.url)).toEqual(['https://c.com', 'https://b.com']);
  });

  it('never takes a pin past five references', () => {
    const existing = ['https://1.com', 'https://2.com', 'https://3.com', 'https://4.com'];
    const out = freshReferences([ref('https://a.com', 80), ref('https://b.com', 90)], existing, null);
    expect(out.map((r) => r.url)).toEqual(['https://b.com']);
  });

  it('keeps well-formed start and end dates, dropping an end before the start', () => {
    const [kept] = freshReferences([ref('https://a.com', 80, { startDate: '2014-03-01', endDate: '2014-03-03' })], [], null);
    expect(kept).toMatchObject({ startDate: '2014-03-01', endDate: '2014-03-03' });
    const [backwards] = freshReferences([ref('https://b.com', 80, { startDate: '2014-03-05', endDate: '2014-03-01' })], [], null);
    expect(backwards).toMatchObject({ startDate: '2014-03-05', endDate: null });
  });

  it('nulls a malformed date and an empty title, and rejects non-http urls', () => {
    const out = freshReferences([ref('https://a.com', 80, { title: '  ', publishedDate: 'May 2016' }), ref('ftp://b.com')], [], null);
    expect(out).toEqual([{ url: 'https://a.com', title: null, confidence: 80, publishedDate: null, startDate: null, endDate: null, reasoning: null }]);
  });
});
