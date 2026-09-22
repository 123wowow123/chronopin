import { describe, expect, it } from 'vitest';
import { seriesExtent, sizeOf } from './series';

describe('seriesExtent', () => {
  it('pads the band so a peak is not clipped and a floor does not sit on the axis', () => {
    const { min, max } = seriesExtent([
      { day: '2026-01-02', value: 100 },
      { day: '2026-01-09', value: 200 },
    ]);
    expect(min).toBeLessThan(100);
    expect(max).toBeGreaterThan(200);
  });

  it('still gives a usable band when every week is the same number', () => {
    const { min, max } = seriesExtent([
      { day: '2026-01-02', value: 400 },
      { day: '2026-01-09', value: 400 },
    ]);
    expect(max).toBeGreaterThan(min);
  });

  it('answers a drawable band for an empty series rather than dividing by zero', () => {
    expect(seriesExtent([])).toEqual({ points: [], min: 0, max: 1 });
  });
});

describe('sizeOf', () => {
  it('reads thousand barrels as millions, which is how the reporting says it', () => {
    expect(sizeOf('Thousand Barrels')).toEqual({ divide: 1000, label: 'million bbl' });
  });

  it('does not read a per-day unit as a stock', () => {
    expect(sizeOf('Thousand Barrels per Day')?.label).toBe('million bbl/d');
  });

  it('leaves a unit it does not know alone rather than guessing', () => {
    expect(sizeOf('Dollars per Gallon')).toBeNull();
  });
});
