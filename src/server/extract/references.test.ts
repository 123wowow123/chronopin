import { describe, expect, it } from 'vitest';
import { keepReferences, MIN_CONFIDENCE, urlKey } from './references';

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
        { url: 'https://news.example/launch', title: ' Launch set ', confidence: 80, publishedDate: '2026-09-01' },
        { url: 'https://maker.example/press/', title: 'Press release', confidence: 95, publishedDate: 'Sept 2026' },
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
      { url: 'https://news.example/launch', title: 'Launch set', confidence: 80, publishedDate: '2026-09-01' },
    ]);
  });
});
