import { describe, expect, it } from 'vitest';
import { sourceKey, wikiTrees } from './source';

describe('wikiTrees', () => {
  it('nests pages under their parents in position order, one tree per source', () => {
    const row = (id: number, sourceId: number, parentId: number | null, position: number) => ({
      id, sourceId, parentId, position, type: 'Topic', title: `p${id}`, summary: '', body: '', tags: [],
    });
    const [a, b] = wikiTrees([row(5, 1, 1, 1), row(1, 1, null, 0), row(4, 1, 1, 0), row(6, 1, 4, 0), row(9, 2, null, 0)]);
    expect(a.id).toBe(1);
    expect(a.children.map((c) => c.id)).toEqual([4, 5]);
    expect(a.children[0].children.map((c) => c.id)).toEqual([6]);
    expect(b.id).toBe(9);
  });
});

describe('sourceKey', () => {
  it('keys a link however it was written, and refuses what cannot be keyed', () => {
    expect(sourceKey('https://www.Example.com/a/')).toBe(sourceKey('http://example.com/a'));
    expect(sourceKey('ftp://example.com/a')).toBeUndefined();
    expect(sourceKey(`https://example.com/${'a'.repeat(2100)}`)).toBeUndefined();
    expect(sourceKey(null)).toBeUndefined();
  });
});
