import { describe, expect, it } from 'vitest';
import { urlKey } from '@/lib/citations';
import { citePostedSummary, citeSummary, keepReferences, MIN_CONFIDENCE } from './references';

describe('urlKey', () => {
  it('reads the same page however it is written', () => {
    expect(urlKey('https://www.Example.com/news/launch/#top')).toBe(urlKey('http://example.com/news/launch'));
    expect(urlKey('https://example.com/a?id=1')).not.toBe(urlKey('https://example.com/a?id=2'));
    expect(urlKey('ftp://example.com/a')).toBeUndefined();
    expect(urlKey('not a url')).toBeUndefined();
  });
});

describe('keepReferences', () => {
  const seen = new Set(['news.example/launch', 'maker.example/press', 'src.example/story', 'weak.example/x'].map((u) => urlKey(`https://${u}`)!));

  it('keeps only confident references a result returned, strongest first', () => {
    const kept = keepReferences(
      [
        { url: 'https://news.example/launch', title: ' Launch set ', confidence: 80, publishedDate: '2026-09-01', reasoning: '  Reports the launch for Sept 1.  ' },
        { url: 'https://maker.example/press/', title: 'Press release', confidence: 95, publishedDate: 'Sept 2026', reasoning: '   ' },
        { url: 'https://www.news.example/launch#more', title: 'Dupe', confidence: 99 },
        { url: 'https://src.example/story', title: 'The source', confidence: 90 },
        { url: 'https://weak.example/x', title: 'Weak', confidence: MIN_CONFIDENCE - 1 },
        { url: 'https://invented.example/guess', title: 'From memory', confidence: 99 },
      ],
      seen,
      'https://src.example/story',
    );
    expect(kept).toEqual([
      { url: 'https://maker.example/press/', title: 'Press release', confidence: 95, publishedDate: undefined },
      { url: 'https://news.example/launch', title: 'Launch set', confidence: 80, publishedDate: '2026-09-01', reasoning: 'Reports the launch for Sept 1.' },
    ]);
  });
});

describe('keepReferences: unconfirmed reports', () => {
  const seen = new Set(['news.example/launch', 'leak.example/a', 'leak.example/b', 'leak.example/c', 'leak.example/d'].map((u) => urlKey(`https://${u}`)!));
  const report = (n: string, extra = {}) => ({ url: `https://leak.example/${n}`, title: n, confidence: 40, startDate: '2026-12-01', reasoning: `Unconfirmed report: Site ${n} says it is testing it, on unnamed sources.`, ...extra });

  it('keeps up to two after the references, rated under 50, with no date claim', () => {
    const kept = keepReferences([report('a', { confidence: 90 }), report('b'), report('c'), { url: 'https://news.example/launch', confidence: 80 }], seen, 'https://src.example/story');
    expect(kept.map((r) => [r.url, r.confidence])).toEqual([
      ['https://news.example/launch', 80],
      ['https://leak.example/a', 49],
      ['https://leak.example/b', 40],
    ]);
    expect(kept.slice(1).every((r) => !r.startDate && !r.endDate)).toBe(true);
  });

  it('is never cited as support in the summary', () => {
    const candidates = [{ url: 'https://news.example/launch', confidence: 80 }, report('a')];
    const kept = keepReferences(candidates, seen, 'https://src.example/story');
    const html = citeSummary('<ul><li>Fact [1][2]</li></ul>', candidates, kept, 'https://src.example/story')!;
    expect(html).toContain('news.example/launch');
    expect(html).not.toContain('leak.example');
  });
});

describe('citeSummary', () => {
  const candidates = [
    { url: 'https://news.example/launch', confidence: 80 },
    { url: 'https://weak.example/x', confidence: MIN_CONFIDENCE - 1 },
    { url: 'https://maker.example/press?a=1&b=2', confidence: 95 },
  ];
  const kept = [candidates[2], candidates[0]];

  it('writes [S] and [n] as the links they stand for, dropping references not kept', () => {
    expect(citeSummary('<ul><li>Opens Sept 18 [S][1]</li><li>Costs $5M [2, 3]</li><li>Delayed [2]</li></ul>', candidates, kept, 'https://src.example/story')).toBe(
      '<ul><li>Opens Sept 18<cite data-ref="https://src.example/story"></cite><cite data-ref="https://news.example/launch"></cite></li>' +
        '<li>Costs $5M<cite data-ref="https://maker.example/press?a=1&amp;b=2"></cite></li><li>Delayed</li></ul>',
    );
  });

  it('is undefined when there is no summary', () => {
    expect(citeSummary(null, candidates, kept, 'https://src.example/story')).toBeUndefined();
    expect(citeSummary('  ', candidates, kept, 'https://src.example/story')).toBeUndefined();
  });
});

describe('citePostedSummary', () => {
  const refs = [{ url: 'https://a.example/one' }, { url: 'https://b.example/two' }];

  it('links [S] to the source and [n] to the nth reference, runs together', () => {
    const html = citePostedSummary('<ul><li>Opens.[S]</li><li>Late.[1][2]</li><li>Gone.[3]</li></ul>', 'https://src.example/', refs)!;
    expect(html).toContain('data-ref="https://src.example/"');
    expect(html).toContain('data-ref="https://a.example/one"');
    expect(html).toContain('data-ref="https://b.example/two"');
    expect(html).not.toMatch(/\[(S|\d)\]/);
  });

  it('leaves a summary with no labels alone', () => {
    const html = '<ul><li>Opens.<cite data-ref="https://src.example/">1</cite></li></ul>';
    expect(citePostedSummary(html, 'https://src.example/', refs)).toBe(html);
    expect(citePostedSummary(null, 'https://src.example/', refs)).toBeNull();
  });
});
