import { describe, expect, it } from 'vitest';
import { averageByPeriod, bucketUnit, explainSentiment, majorProducts } from './companySentiment';

const at = (day: string) => Date.parse(`${day}T00:00:00Z`);

describe('bucketUnit', () => {
  it('uses months under three years and years beyond', () => {
    expect(bucketUnit([{ at: at('2025-01-01'), value: 0 }, { at: at('2026-06-01'), value: 0 }])).toBe('month');
    expect(bucketUnit([{ at: at('2010-01-01'), value: 0 }, { at: at('2026-06-01'), value: 0 }])).toBe('year');
    expect(bucketUnit([{ at: at('2010-01-01'), value: 0 }])).toBe('month');
  });
});

describe('averageByPeriod', () => {
  it('averages each month and places it mid-month, in order', () => {
    const buckets = averageByPeriod(
      [
        { at: at('2026-03-20'), value: -0.5 },
        { at: at('2026-01-05'), value: 1 },
        { at: at('2026-01-25'), value: 0 },
      ],
      'month',
    );
    expect(buckets.map((b) => [new Date(b.at).toISOString().slice(0, 10), b.value, b.count])).toEqual([
      ['2026-01-16', 0.5, 2],
      ['2026-03-16', -0.5, 1],
    ]);
  });

  it('averages each year', () => {
    const buckets = averageByPeriod(
      [
        { at: at('1998-02-01'), value: 0.2 },
        { at: at('1998-11-01'), value: 0.4 },
        { at: at('2004-06-01'), value: -1 },
      ],
      'year',
    );
    expect(buckets.map((b) => [new Date(b.at).getUTCFullYear(), b.value, b.count])).toEqual([
      [1998, 0.3, 2],
      [2004, -1, 1],
    ]);
  });
});

describe('explainSentiment', () => {
  const now = at('2026-09-22');
  const pin = (id: number, day: string, value: number) => ({ id, title: `Pin ${id}`, at: `${day}T00:00:00.000Z`, value });

  it('says nothing without pins', () => {
    expect(explainSentiment([], now)).toBeNull();
  });

  it('sets the newest third of past pins against the rest, and leaves the future out of it', () => {
    const pins = [
      pin(1, '2024-01-01', 0.6),
      pin(2, '2024-06-01', 0.5),
      pin(3, '2025-01-01', 0.7),
      pin(4, '2025-06-01', 0.4),
      pin(5, '2026-03-01', -0.5),
      pin(6, '2026-08-01', 0),
      pin(7, '2027-01-01', 1),
    ];
    const explained = explainSentiment(pins, now)!;
    expect(explained.count).toBe(7);
    expect(explained.trend).toEqual({ direction: 'down', recent: -0.25, earlier: 0.55 });
    expect(explained.upcoming).toEqual({ average: 1, count: 1 });
    // Drivers come from the recent pins: 6 (0) and 5 (-0.5) are both below the 0.39 average.
    expect(explained.dragging.map((p) => p.id)).toEqual([5, 6]);
    expect(explained.lifting).toEqual([]);
  });

  it('has no direction with too few past pins, and picks drivers from what there is', () => {
    const explained = explainSentiment([pin(1, '2025-01-01', 0.8), pin(2, '2025-02-01', -0.4)], now)!;
    expect(explained.trend).toBeNull();
    expect(explained.lifting.map((p) => p.id)).toEqual([1]);
    expect(explained.dragging.map((p) => p.id)).toEqual([2]);
  });
});

describe('majorProducts', () => {
  const pin = (id: number, day: string, value: number, product: string | null) => ({ id, title: `Pin ${id}`, at: `${day}T00:00:00Z`, value, product });

  it('groups pins by product whatever the case, most pinned first, with their comments', () => {
    const products = majorProducts({
      pins: [
        pin(1, '2025-01-01', 0.5, 'iPhone'),
        pin(2, '2025-06-01', -0.5, 'Vision Pro'),
        pin(3, '2026-01-01', 0.25, 'iphone'),
        pin(4, '2026-02-01', 0.75, 'iPhone'),
        pin(5, '2026-03-01', -0.25, null),
        pin(6, '2026-04-01', 0.5, 'AirPods'),
      ],
      comments: [
        { at: '2026-01-02T00:00:00Z', value: 1, pinId: 3 },
        { at: '2026-03-02T00:00:00Z', value: -1, pinId: 5 },
        { at: '2026-03-03T00:00:00Z', value: 0 },
      ],
    });
    expect(products.map((p) => p.name)).toEqual(['iPhone', 'AirPods', 'Vision Pro']);
    expect(products[0].average).toBe(0.5);
    expect(products[0].sentiment.pins.map((p) => p.id)).toEqual([1, 3, 4]);
    expect(products[0].sentiment.comments).toEqual([{ at: '2026-01-02T00:00:00Z', value: 1, pinId: 3 }]);
  });

  it('pictures each product with its newest pin that has a picture, else none', () => {
    const products = majorProducts({
      pins: [
        { ...pin(1, '2025-01-01', 0.5, 'Model 3'), thumbName: 'old.jpg' },
        { ...pin(2, '2025-06-01', 0.5, 'Model 3'), originalUrl: 'https://example.com/new.jpg' },
        pin(3, '2026-01-01', 0.5, 'Model 3'),
        pin(4, '2026-01-01', 0.5, 'Roadster'),
      ],
      comments: [],
    });
    expect(products.map((p) => p.picture)).toEqual([{ thumbName: undefined, originalUrl: 'https://example.com/new.jpg' }, null]);
  });

  it('falls back to the picture looked up for a product none of whose pins has one', () => {
    const products = majorProducts({
      pins: [{ ...pin(1, '2026-01-01', 0.5, 'Model 3'), thumbName: 'm3.jpg' }, pin(2, '2025-01-01', 0.5, 'Roadster')],
      comments: [],
      productPictures: { 'model 3': 'https://example.com/looked-up.jpg', roadster: 'https://example.com/roadster.jpg' },
    });
    expect(products.map((p) => p.picture)).toEqual([{ thumbName: 'm3.jpg', originalUrl: undefined }, { originalUrl: 'https://example.com/roadster.jpg' }]);
  });

  it('is empty when no pin has a product', () => {
    expect(majorProducts({ pins: [pin(1, '2025-01-01', 0.5, null)], comments: [] })).toEqual([]);
  });
});
