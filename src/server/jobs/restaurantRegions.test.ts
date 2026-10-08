import { afterEach, describe, expect, it, vi } from 'vitest';
import { restaurantRegionsToRefresh } from './signals';
import catalog from '../data/regionalRestaurants.json';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../db', () => ({ query }));
vi.mock('../model/pinView', () => ({ default: {} }));
vi.mock('../model/appSetting', () => ({ getTimelineConfidence: vi.fn() }));
vi.mock('../model/pins', () => ({ pinConfidenceOf: vi.fn() }));
afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });

describe('restaurant refresh coverage', () => {
  it('returns shortages with no new pins and counts only live catalog selections as top', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
    const top = catalog.find((entry) => entry.regionSlug === 'paris' && entry.kind === 'top')!;
    const common = { region: 'paris', created: new Date('2026-01-01T00:00:00Z'), dateConfidence: 'confirmed', title: 'Restaurant' };
    query.mockResolvedValue([
      { ...common, id: 1, day: '2026-09-01', sourceUrl: top.sourceUrl, opening: false },
      { ...common, id: 2, day: '2026-10-02', sourceUrl: 'https://example.com/open', opening: true },
      { ...common, id: 3, day: '2026-06-01', sourceUrl: 'https://example.com/old', opening: true },
      { ...common, id: 4, day: '2026-09-01', sourceUrl: 'https://example.com/unselected', opening: false },
    ]);
    const result = await restaurantRegionsToRefresh(new Date('2026-10-06T00:00:00Z'));
    expect(result.find((region) => region.slug === 'paris')).toMatchObject({
      newPins: [], targetPerTab: 12, counts: { upcoming: 0, new: 1, top: 1 }, needed: { upcoming: 12, new: 11, top: 11 },
    });
    expect(result.find((region) => region.slug === 'stockholm')).toMatchObject({ counts: { upcoming: 0, new: 0, top: 0 } });
  });

  it('prioritizes a city with a new opening over an empty city', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
    query.mockResolvedValue([{ region: 'Paris', id: 1, title: 'New opening', created: new Date('2026-10-07T01:00:00Z'), day: '2026-11-01', dateConfidence: 'estimated', sourceUrl: null, opening: true }]);
    const result = await restaurantRegionsToRefresh(new Date('2026-10-06T00:00:00Z'));
    expect(result[0]).toMatchObject({ slug: 'paris', counts: { upcoming: 1, new: 0, top: 0 }, newPins: [{ id: 1 }] });
  });
});
