import { describe, expect, it } from 'vitest';
import { confidenceStats, pinTimeStats } from './confidenceStats';

describe('confidenceStats', () => {
  const rows = [
    { category: 'Tech', userName: 'a', confidence: 90 },
    { category: 'Tech', userName: 'a', confidence: 69 },
    { category: 'Tech', userName: 'b', confidence: 70 },
    { category: 'Film', userName: 'b', confidence: 25 },
    { category: null, userName: null, confidence: null },
    { category: 'Film', userName: 'b', confidence: 100 },
  ];

  it('counts unscored pins as showing, and scores below the threshold as hidden', () => {
    const stats = confidenceStats(rows, 70);
    expect(stats).toMatchObject({ total: 6, showing: 4, hidden: 2, unscored: 1 });
  });

  it('bands scores by tens, with 100 in the top band', () => {
    const { bands } = confidenceStats(rows, 70);
    expect(bands.map((b) => b.showing + b.hidden)).toEqual([0, 0, 1, 0, 0, 0, 1, 1, 0, 2]);
    expect(bands[6]).toMatchObject({ label: '60–69', hidden: 1, showing: 0 });
    expect(bands[7]).toMatchObject({ label: '70–79', hidden: 0, showing: 1 });
  });

  it('groups largest first and folds the rest into Other', () => {
    const { byCategory, byAuthor } = confidenceStats(rows, 70, 2);
    expect(byCategory).toEqual([
      { label: 'Tech', showing: 2, hidden: 1 },
      { label: 'Other (2)', showing: 2, hidden: 1 },
    ]);
    expect(byAuthor[0]).toEqual({ label: 'b', showing: 2, hidden: 1 });
  });
});

describe('pinTimeStats', () => {
  it('splits each period into showing and hidden, carrying earlier pins into the total', () => {
    const pins = [
      { created: '2025-01-01T00:00:00Z', hidden: false },
      { created: '2026-09-14T01:00:00Z', hidden: true },
      { created: '2026-09-14T02:00:00Z', hidden: false },
    ];
    const stats = pinTimeStats(pins, '30d', new Date('2026-09-14T12:00:00Z'));
    expect(stats).toMatchObject({ unit: 'day', added: 2, hidden: 1 });
    expect(stats.buckets[0]).toEqual({ start: '2026-08-16T00:00:00.000Z', showing: 0, hidden: 0, total: 1 });
    expect(stats.buckets.at(-1)).toEqual({ start: '2026-09-14T00:00:00.000Z', showing: 1, hidden: 1, total: 3 });
  });
});
