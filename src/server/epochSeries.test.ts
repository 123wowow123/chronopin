import { describe, expect, it } from 'vitest';
import { epochUrl, parseEpochId, parseRows, parseTimeline, slugify } from './epochSeries';

const csv = [
  'Data center,Date,Construction status,Buildings operational,IT power (MW),Power (MW),H100 equivalents,Performance (8-bit OP/s),Total capital cost (2025 USD billions),Compute cost (2025 USD billions),Construction cost (2025 USD billions),Annual operating cost (2025 USD billions),Water use (MGD),Current H100 equivalents (from Data center)',
  'Meta Los Lunas,2028-01-01,"Building 3, projected.",3.0,218.0,273.0,869125.8,0,8.258,0,0,0,,133906',
  'Meta Los Lunas,2024-07-24,"Land clearing',
  'starts, ""new"" building.",0.0,0.0,0.0,0.0,0,0.0,0.0,0.0,0.0,,133906',
  'Meta Los Lunas,2026-10-26,Building 2 operational.,2.0,118.0,147.0,133906.0,0,4.47,0,0,0,,133906',
  'Other Site,2026-01-01,x,1.0,5.0,6.0,7.0,0,1.0,0,0,0,,7',
].join('\n');

describe('parseEpochId', () => {
  it('reads the slug and the metric', () => {
    expect(parseEpochId('Meta-Los-Lunas:IT')).toEqual({ slug: 'meta-los-lunas', metric: 'it' });
  });
  it('refuses a missing or unknown metric and anything odd', () => {
    expect(parseEpochId('meta-los-lunas')).toBeNull();
    expect(parseEpochId('meta-los-lunas:water')).toBeNull();
    expect(parseEpochId('../x:it')).toBeNull();
  });
});

describe('parseRows', () => {
  it('keeps quoted commas, quotes and line breaks inside one field', () => {
    expect(parseRows(csv)[2][2]).toBe('Land clearing\nstarts, "new" building.');
  });
});

describe('parseTimeline', () => {
  it('returns one campus, one metric, oldest first, projections included', () => {
    const s = parseTimeline(csv, 'meta-los-lunas:it');
    expect(s?.points).toEqual([
      { day: '2024-07-24', value: 0 },
      { day: '2026-10-26', value: 118 },
      { day: '2028-01-01', value: 218 },
    ]);
    expect(s?.units).toBe('MW');
    expect(s?.sourceUrl).toBe('https://epoch.ai/data/ai-data-centers/directory/meta-los-lunas');
  });
  it('reads the other metrics and is null for an unknown campus', () => {
    expect(parseTimeline(csv, 'meta-los-lunas:cost')?.points.at(-1)?.value).toBe(8.258);
    expect(parseTimeline(csv, 'nowhere:it')).toBeNull();
  });
});

describe('slugify', () => {
  it('matches the directory slugs', () => {
    expect(slugify('Google Council Bluffs (East)')).toBe('google-council-bluffs-east');
    expect(epochUrl('meta-los-lunas:it')).toContain('/meta-los-lunas');
  });
});
