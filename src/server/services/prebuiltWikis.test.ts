import { describe, expect, it } from 'vitest';
import { HttpError } from '../util/httpError';
import { MAX_PREBUILT_WIKIS, parsePrebuiltWikis } from './prebuiltWikis';

const page = { title: 'Launch', summary: 'What the page covers.', body: '- a fact', tags: ['launch'] };
const message = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(HttpError);
    return ((err as HttpError).body as { message: string }).message;
  }
  throw new Error('did not throw');
};

describe('parsePrebuiltWikis', () => {
  it('takes nothing as no wikis', () => {
    expect(parsePrebuiltWikis(undefined)).toEqual([]);
    expect(parsePrebuiltWikis(null)).toEqual([]);
  });

  it('reads one page as a one-part wiki and defaults the actor', () => {
    const [wiki] = parsePrebuiltWikis([{ url: ' https://example.com/a ', wiki: page }]);
    expect(wiki.url).toBe('https://example.com/a');
    expect(wiki.parts).toEqual([page]);
    expect(wiki.root).toBeUndefined();
    expect(wiki.generatedBy).toBe('claude-code/session');
  });

  it('reads a wiki in parts with its root', () => {
    const [wiki] = parsePrebuiltWikis([{ url: 'https://example.com/a', kind: 'youtube', generatedBy: 'claude-code/claude-opus-5', wiki: { parts: [page, page], root: page } }]);
    expect(wiki.parts).toHaveLength(2);
    expect(wiki.root).toEqual(page);
    expect(wiki.kind).toBe('youtube');
  });

  it('names the entry that is wrong', () => {
    expect(message(() => parsePrebuiltWikis([{ url: 'https://example.com/a', wiki: page }, { url: 'ftp://x', wiki: page }], 'sourceWikis'))).toBe('sourceWikis[1]: url must be an http(s) link');
    expect(message(() => parsePrebuiltWikis([{ url: 'https://example.com/a', wiki: { title: 'x' } }]))).toMatch(/^wikis\[0\]: wiki must be one page/);
    expect(message(() => parsePrebuiltWikis([{ url: 'https://example.com/a', wiki: { parts: [page, page] } }]))).toBe('wikis[0]: a wiki in parts needs a root page');
    expect(message(() => parsePrebuiltWikis([{ url: 'https://example.com/a', kind: 'blog', wiki: page }]))).toMatch(/kind must be one of/);
    expect(message(() => parsePrebuiltWikis([{ url: 'https://example.com/a', generatedBy: 'someone', wiki: page }]))).toMatch(/OKF actor/);
    expect(message(() => parsePrebuiltWikis('nope'))).toBe('wikis must be an array');
  });

  it('caps a request', () => {
    const many = Array.from({ length: MAX_PREBUILT_WIKIS + 1 }, (_, i) => ({ url: `https://example.com/${i}`, wiki: page }));
    expect(message(() => parsePrebuiltWikis(many))).toMatch(/At most 25/);
  });
});
