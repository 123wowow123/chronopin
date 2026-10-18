import { describe, expect, it } from 'vitest';
import { fredUrl, parseCsv, parseFredId } from './fredSeries';

describe('parseFredId', () => {
  it('reads a bare id as the series as published', () => {
    expect(parseFredId('pcepi')).toEqual({ id: 'PCEPI', transformation: 'LIN' });
  });

  it('reads the units code after the colon', () => {
    expect(parseFredId('PCEPI:pc1')).toEqual({ id: 'PCEPI', transformation: 'PC1' });
  });

  it('refuses anything that could add to the URL, or a code FRED does not have', () => {
    expect(parseFredId('PCEPI&id=X')).toBeNull();
    expect(parseFredId('PCEPI:ZZZ')).toBeNull();
    expect(parseFredId('')).toBeNull();
  });
});

describe('parseCsv', () => {
  const csv = 'observation_date,PCEPI_PC1\n2026-06-01,3.45301\n2026-05-01,3.82333\n2026-07-01,.\n2026-08-01,3.41903\n';
  const series = parseCsv(csv, 'PCEPI:PC1');

  it('reads a month per row, sorted, and skips a missing observation instead of zeroing it', () => {
    expect(series.points).toEqual([
      { day: '2026-05-01', value: 3.82333 },
      { day: '2026-06-01', value: 3.45301 },
      { day: '2026-08-01', value: 3.41903 },
    ]);
  });

  it('is monthly, and names its units from the transformation', () => {
    expect(series.frequency).toBe('monthly');
    expect(series.units).toBe('Percent Change from Year Ago');
  });

  it('is weekly when the rows are a week apart', () => {
    expect(parseCsv('observation_date,X\n2026-09-04,1\n2026-09-11,2\n', 'X').frequency).toBe('weekly');
  });

  it('links to the series page, not the CSV', () => {
    expect(series.sourceUrl).toBe('https://fred.stlouisfed.org/series/PCEPI');
    expect(fredUrl('PCEPILFE:PC1')).toBe('https://fred.stlouisfed.org/series/PCEPILFE');
  });
});
