import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildUnpricedChart, readModelUniverse, type ModelUniverse } from './modelChart';

vi.mock('./db', () => ({ query: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

const retired = { key: 'gemini 3 pro', name: 'gemini-3-pro', organization: 'Google', elo: 1450 };
const pin = { id: 5010, title: 'Gemini 3 Pro Released', utcStartDateTime: '2025-11-18T00:00:00Z' };
const universe: ModelUniverse = {
  points: [{ key: 'gemini 4 argon', name: 'Gemini 4 Argon', organization: 'Google', elo: 1530, price: 3, year: 2026 }],
  publishedOn: '2026-10-14', unscored: [], unpriced: [retired],
};
const pins = [{ id: 5023, title: 'Gemini 4 Argon Released', words: ['gemini', '4', 'argon', 'released'] }];

describe('models without a current price', () => {
  it('keeps live Arena scores when the router no longer lists the model', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url.includes('huggingface') ? {
      rows: [{ row: { category: 'overall', model_name: 'gemini-3-pro', rating: 1450, organization: 'Google', leaderboard_publish_date: '2026-10-14' } }],
    } : { data: [] })));
    const data = await readModelUniverse();
    expect(data.unpriced).toEqual([retired]);
    expect(data.points).toEqual([]);
    expect(data.publishedOn).toBe('2026-10-14');
  });

  it('shows its score against the field without assigning a price or frontier status', () => {
    const chart = buildUnpricedChart(universe, pins, pin)!;
    expect(chart.unpriced).toEqual({ ...retired, year: 2025 });
    expect(chart.unpriced).not.toHaveProperty('price');
    expect(chart.unpriced).not.toHaveProperty('frontier');
    expect(chart.pinned).toBeNull();
    expect(chart.points.map((p) => p.pinId)).toEqual([5023]);
    expect(chart.years).toEqual([2026, 2025]);
  });

  it('does not borrow an image variant score or a different version', () => {
    const variants = { ...universe, unpriced: [
      { ...retired, key: 'gemini 3 pro image' },
      { ...retired, key: 'gemini 3.1 pro' },
    ] };
    expect(buildUnpricedChart(variants, pins, pin)).toBeNull();
  });

  it('rejects an invalid release date', () => {
    expect(buildUnpricedChart(universe, pins, { ...pin, utcStartDateTime: 'invalid' })).toBeNull();
  });
});
