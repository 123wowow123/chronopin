import { describe, expect, it } from 'vitest';
import { parseHistory, parseOrnnId, ornnUrl } from './ornnSeries';

describe('ornn series', () => {
  it('normalises GPU names and rejects odd ones', () => {
    expect(parseOrnnId(' h100  sxm ')).toBe('H100 SXM');
    expect(parseOrnnId('../x')).toBeNull();
  });
  it('links to the GPU page', () => {
    expect(ornnUrl('H100 SXM')).toBe('https://data.ornn.com/home/h100');
  });
  it('reads settled days, oldest first, skipping bad rows', () => {
    const s = parseHistory({ data: [
      { timestamp: '2026-08-28T04:00:00.000Z', index_value: 2.91 },
      { timestamp: '2026-08-27T04:00:00.000Z', index_value: 2.84 },
      { timestamp: 'x', index_value: 1 },
      { timestamp: '2026-08-29T04:00:00.000Z', index_value: null },
    ] }, 'H100 SXM');
    expect(s?.points).toEqual([{ day: '2026-08-27', value: 2.84 }, { day: '2026-08-28', value: 2.91 }]);
    expect(s?.units).toBe('USD per GPU-hour');
  });
});
