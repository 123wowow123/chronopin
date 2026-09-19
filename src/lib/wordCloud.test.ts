import { describe, expect, it } from 'vitest';
import { cloudShape, cloudWeights, colorFor, dilate, fitScale, hash, isVertical, layoutCloud, LIGHT_PALETTE, scalesFrom, shapeArea, type CloudWord, type Sprite } from './wordCloud';

// A solid box sprite of w x h cells, anchored at its bottom middle.
const box = (w: number, h: number): Sprite => ({ cols: w, rows: h, offX: -Math.floor(w / 2), offY: -h, cells: new Uint8Array(w * h).fill(1) });

const words = (n: number): CloudWord[] => Array.from({ length: n }, (_, i) => ({ key: `w${i}`, text: `w${i}`, weight: 1 - i / n, vertical: false }));

// Each placed word's cells on the board, to check for overlaps.
function cellsOf(p: { x: number; y: number; size: number }, cell: number) {
  const s = box(Math.round(p.size), Math.round(p.size / 3));
  const ax = Math.round(p.x / cell);
  const ay = Math.round(p.y / cell);
  const out: string[] = [];
  for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) out.push(`${ax + s.offX + x},${ay + s.offY + y}`);
  return out;
}

describe('layoutCloud', () => {
  const options = {
    width: 400,
    height: 240,
    cell: 2,
    inside: () => true,
    sizeFor: (w: number, scale: number) => Math.round((6 + 20 * w) * scale),
    sprite: (_w: CloudWord, size: number) => box(size, Math.round(size / 3)),
    pad: 0,
  };

  it('places every word inside the board without overlaps, biggest first near the middle', () => {
    const placed = layoutCloud(words(30), options);
    expect(placed).toHaveLength(30);
    const seen = new Set<string>();
    for (const p of placed) {
      for (const c of cellsOf(p, 2)) {
        expect(seen.has(c), c).toBe(false);
        seen.add(c);
      }
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(400);
    }
    expect(Math.abs(placed[0].x - 200)).toBeLessThan(40);
    expect(Math.abs(placed[0].y - 120)).toBeLessThan(40);
  });

  it('is the same every time', () => {
    expect(layoutCloud(words(20), options)).toEqual(layoutCloud(words(20), options));
  });

  it('shrinks the words until they fit, and keeps the most it could when none does', () => {
    const tight = { ...options, width: 120, height: 60 };
    const placed = layoutCloud(words(12), tight);
    expect(placed.length).toBeGreaterThan(0);
    expect(placed.every((p) => p.size <= tight.sizeFor(1, 1))).toBe(true);
    const tiny = layoutCloud(words(200), { ...options, width: 40, height: 20 });
    expect(tiny.length).toBeLessThan(200);
  });

  it('keeps words inside the shape', () => {
    const inside = (x: number) => x < 200;
    const placed = layoutCloud(words(10), { ...options, inside });
    expect(placed.every((p) => p.x + p.size / 2 <= 202)).toBe(true);
  });
});

describe('scales', () => {
  it('guesses the scale at which the words would fill the shape', () => {
    expect(fitScale([100, 100], 10_000, 0.5)).toBe(1);
    expect(fitScale([10_000, 10_000], 10_000, 0.5)).toBeCloseTo(0.5);
    expect(fitScale([], 10_000)).toBe(1);
  });

  it('steps down from a start', () => {
    expect(scalesFrom(0.8, 3, 0.5)).toEqual([0.8, 0.4, 0.2]);
  });

  it('measures the shape', () => {
    expect(shapeArea(100, 100, () => true, 10)).toBe(10_000);
    expect(shapeArea(100, 100, (x) => x < 50, 10)).toBe(5_000);
  });
});

describe('dilate', () => {
  it('grows a sprite by the pad every way', () => {
    const grown = dilate(box(2, 1), 1);
    expect([grown.cols, grown.rows, grown.offX, grown.offY]).toEqual([4, 3, -2, -2]);
    expect([...grown.cells].every(Boolean)).toBe(true);
  });
});

describe('helpers', () => {
  it('draws a cloud with a flat bottom', () => {
    const inside = cloudShape(1000, 600);
    expect(inside(500, 330)).toBe(true);
    expect(inside(5, 5)).toBe(false);
    expect(inside(500, 590)).toBe(false);
  });

  it('draws a rounded blob in a tall box', () => {
    const inside = cloudShape(400, 800);
    expect(inside(200, 400)).toBe(true);
    expect(inside(200, 60)).toBe(true);
    expect(inside(5, 5)).toBe(false);
  });

  it('weighs counts on a log scale', () => {
    expect(cloudWeights([1, 10, 100])).toEqual([0, 0.5, 1]);
    expect(cloudWeights([4, 4])).toEqual([0.5, 0.5]);
  });

  it('turns about a quarter of the words, never the top three, and colours them stably', () => {
    expect([0, 1, 2].some((rank) => isVertical('x', rank))).toBe(false);
    const turned = Array.from({ length: 400 }, (_, i) => isVertical(`tag ${i}`, 10)).filter(Boolean).length;
    expect(turned).toBeGreaterThan(60);
    expect(turned).toBeLessThan(140);
    expect(colorFor('Artemis', LIGHT_PALETTE)).toBe(colorFor('Artemis', LIGHT_PALETTE));
    expect(hash('a')).not.toBe(hash('b'));
  });
});
