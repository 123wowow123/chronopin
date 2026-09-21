import { describe, expect, it, vi } from 'vitest';

// The rows each of pinGraph's five queries finds, keyed off what the SQL asks
// for, so a test only has to say what the pins share.
const rows = vi.hoisted(() => ({
  threads: [] as { a: number; b: number }[],
  duplicates: [] as { a: number; b: number }[],
  company: [] as { key: string; label: string; pinId: number }[],
  tag: [] as { key: string; label: string; pinId: number }[],
  source: [] as { key: string; label: string; pinId: number }[],
}));

vi.mock('../db', () => ({
  query: async (sql: string) => {
    if (sql.includes('"parentId"')) return rows.threads;
    if (sql.includes('"PinDuplicate"')) return rows.duplicates;
    if (sql.includes('"Company"')) return rows.company;
    if (sql.includes('"PinTag"')) return rows.tag;
    return rows.source;
  },
}));

import { pinGraph } from './pinGraph';

const ids = Array.from({ length: 60 }, (_, i) => i + 1);
const on = (label: string, pins: number[]) => pins.map((pinId) => ({ key: label, label, pinId }));
const graph = (given: Partial<typeof rows>) => {
  Object.assign(rows, { threads: [], duplicates: [], company: [], tag: [], source: [] }, given);
  return pinGraph(ids);
};
const joined = (edges: { a: number; b: number }[], a: number, b: number) => edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));

describe('pinGraph', () => {
  it('leaves two pins apart when all they share is a busy tag', async () => {
    const edges = await graph({ tag: on('Drama', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) });
    expect(edges).toEqual([]);
  });

  it('joins two pins on a tag only they carry', async () => {
    const edges = await graph({ tag: on('Le Bourget', [1, 2]) });
    expect(edges).toEqual([{ a: 1, b: 2, kind: 'tag', label: 'Le Bourget', strength: 0.8 }]);
  });

  it('adds up what a pair shares, and names the narrowest of it', async () => {
    const together = [1, 2, 3, 4, 5, 6];
    const weak = { tag: [...on('Drama', ids.slice(0, 30)), ...on('Crime', ids.slice(0, 30))] };
    // The same company across six pins says too little on its own...
    expect(await graph({ company: on('ABC', together), ...weak })).toEqual([]);
    // ...but with a tag the two of them alone carry, the pair is worth a line.
    const edges = await graph({ company: on('ABC', together), tag: [...weak.tag, ...on('Abbott Elementary', [1, 2])] });
    expect(joined(edges, 1, 2)).toBe(true);
    expect(joined(edges, 3, 4)).toBe(false);
    const edge = edges.find((e) => e.a === 1 && e.b === 2)!;
    expect(edge).toMatchObject({ kind: 'tag', label: 'Abbott Elementary', shared: 4 });
    expect(edge.strength).toBeGreaterThan(0.8);
  });

  it('draws a thread or a confirmed duplicate whatever the two share', async () => {
    const edges = await graph({ threads: [{ a: 2, b: 1 }], duplicates: [{ a: 3, b: 4 }] });
    expect(edges).toEqual([
      { a: 2, b: 1, kind: 'thread', strength: 1.6 },
      { a: 3, b: 4, kind: 'duplicate', strength: 1.6 },
    ]);
  });

  it('keeps a pin to its strongest few lines, so a clique is not a hairball', async () => {
    const clique = [1, 2, 3, 4, 5, 6, 7, 8];
    const edges = await graph({
      company: on('Madhouse', clique),
      tag: [...on('Shonen', clique), ...on('Action', clique)],
    });
    const degree = new Map<number, number>();
    for (const edge of edges) for (const id of [edge.a, edge.b]) degree.set(id, (degree.get(id) ?? 0) + 1);
    expect(Math.max(...degree.values())).toBeLessThanOrEqual(4);
    // Far short of the 28 lines every pair would have drawn.
    expect(edges.length).toBeLessThan(clique.length * 2);
  });

  it('says nothing about a single pin', async () => {
    Object.assign(rows, { threads: [], duplicates: [], company: [], tag: [], source: [] });
    expect(await pinGraph([1])).toEqual([]);
  });
});
