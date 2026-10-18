import { describe, expect, it } from 'vitest';
import { normaliseSeriesId, parseSeries, seriesUrl } from './eiaSeries';

// A cut of the real page: the header row, two month rows, a month with a
// withheld week, and the release lines at the foot.
const PAGE = `
<html><head><title>Weekly U.S. Ending Stocks of Crude Oil in SPR (Thousand Barrels)</title></head>
<body>
<table>
  <tr><td>Year-Month</td><td>Week 1</td><td>Week 2</td><td>Week 3</td><td>Week 4</td><td>Week 5</td></tr>
  <tr><td>1982-Oct</td><td>10/01</td><td>277,633</td><td>10/08</td><td>278,725</td><td>10/15</td><td>280,802</td></tr>
  <tr><td>2026-Aug</td><td>08/07</td><td>298,702</td><td>08/14</td><td>W</td><td>08/21</td><td>290,110</td></tr>
  <tr><td>2026-Dec</td><td>12/25</td><td>310,000</td><td>01/01</td><td>311,000</td></tr>
  <tr><td>Notes</td><td>-- = Not Applicable</td></tr>
  <tr><td>Release Date: 9/16/2026</td></tr>
  <tr><td>Next Release Date: 9/23/2026</td></tr>
</table>
</body></html>`;

describe('parseSeries', () => {
  const series = parseSeries(PAGE, 'WCSSTUS1');

  it('reads a week from every (date, value) pair, dated into the row year', () => {
    expect(series.points.slice(0, 3)).toEqual([
      { day: '1982-10-01', value: 277633 },
      { day: '1982-10-08', value: 278725 },
      { day: '1982-10-15', value: 280802 },
    ]);
  });

  it('leaves out a week with no number rather than reading it as zero', () => {
    expect(series.points.map((p) => p.day)).not.toContain('2026-08-14');
    expect(series.points).toContainEqual({ day: '2026-08-07', value: 298702 });
    expect(series.points).toContainEqual({ day: '2026-08-21', value: 290110 });
  });

  it('rolls a January week in a December row into the next year', () => {
    expect(series.points).toContainEqual({ day: '2026-12-25', value: 310000 });
    expect(series.points).toContainEqual({ day: '2027-01-01', value: 311000 });
  });

  it('sorts by day, whatever order the rows came in', () => {
    const days = series.points.map((p) => p.day);
    expect([...days].sort()).toEqual(days);
  });

  it('reads the units and both release dates off the page', () => {
    expect(series.units).toBe('Thousand Barrels');
    expect(series.releaseDate).toBe('2026-09-16');
    expect(series.nextReleaseDate).toBe('2026-09-23');
  });

  it('carries the publisher URL the id builds', () => {
    expect(series.sourceUrl).toBe(seriesUrl('WCSSTUS1'));
    expect(seriesUrl('WCSSTUS1')).toContain('s=WCSSTUS1');
  });
});

describe('normaliseSeriesId', () => {
  it('upper-cases and trims, so two spellings share a URL and a cache entry', () => {
    expect(normaliseSeriesId(' wcsstus1 ')).toBe('WCSSTUS1');
  });
});
