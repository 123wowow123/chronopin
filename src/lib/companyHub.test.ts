import { describe, expect, it } from 'vitest';
import { nestProducts, productPinCount } from './companyHub';

const pin = (id: number) => ({ id, title: `p${id}`, utcStartDateTime: '2026-01-01T00:00:00Z', allDay: true });

describe('nestProducts', () => {
  const rows = [
    { id: 1, parentId: null, name: 'Vehicles', summary: null, rank: 0 },
    { id: 2, parentId: 1, name: 'Cybertruck', summary: null, rank: 2 },
    { id: 3, parentId: 1, name: 'Model Y', summary: null, rank: 1 },
    { id: 4, parentId: null, name: 'Energy', summary: null, rank: 1 },
    { id: 5, parentId: 99, name: 'Orphan', summary: null, rank: 0 },
  ];
  const pins: Record<number, number[]> = { 2: [10, 11], 3: [12], 4: [13] };
  const tree = nestProducts(rows, (id) => (pins[id] ?? []).map(pin));

  it('nests by parent and orders siblings by rank', () => {
    expect(tree.map((p) => p.name)).toEqual(['Vehicles', 'Energy']);
    expect(tree[0].children.map((p) => p.name)).toEqual(['Model Y', 'Cybertruck']);
  });
  it('drops a product whose parent is missing', () => {
    expect(JSON.stringify(tree)).not.toContain('Orphan');
  });
  it('counts a branch including its children', () => {
    expect(productPinCount(tree[0])).toBe(3);
    expect(productPinCount(tree[1])).toBe(1);
  });
});

import { branchPins, findProduct, productSlug } from './companyHub';

describe('product pages', () => {
  const tree = nestProducts(
    [
      { id: 1, parentId: null, name: 'Vehicles', summary: null, rank: 0 },
      { id: 2, parentId: 1, name: 'Model S and Model X', summary: null, rank: 0 },
    ],
    (id) => (id === 2 ? [pin(5), pin(4)] : [pin(4)]),
  );
  it('slugs a name like a topic', () => expect(productSlug('Model S and Model X')).toBe('model-s-and-model-x'));
  it('finds a nested product with its ancestors', () => {
    const found = findProduct(tree, 'model-s-and-model-x');
    expect(found?.product.id).toBe(2);
    expect(found?.ancestors.map((a) => a.name)).toEqual(['Vehicles']);
    expect(findProduct(tree, 'nope')).toBeNull();
  });
  it('lists a branch once per pin', () => expect(branchPins(tree[0]).map((p) => p.id)).toEqual([4, 5]));
});

import { overviewParagraphs } from './companyHub';
describe('overviewParagraphs', () => {
  it('numbers citations by first use and splits paragraphs', () => {
    const { paragraphs, cited } = overviewParagraphs('One [pin:9] two [pin:4].\n\nThree [pin:9].');
    expect(cited).toEqual([9, 4]);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[1]).toEqual([{ text: 'Three ' }, { cite: 1, pinId: 9 }, { text: '.' }]);
  });
  it('is empty without an overview', () => expect(overviewParagraphs(null).paragraphs).toEqual([]));
});
