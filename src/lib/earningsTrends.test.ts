import { describe, expect, it } from 'vitest';
import { annualPeriods, epsQuarters, margin, withAnnual, nasdaqThousands, parseTrends, revenuePeriods, verdict, type EarningsTrends } from './earningsTrends';

describe('earnings trends', () => {
  it('reads Nasdaq money cells in thousands', () => {
    expect(nasdaqThousands('$319,716')).toBe(319_716_000);
    expect(nasdaqThousands('-$1,656')).toBe(-1_656_000);
    expect(nasdaqThousands('--')).toBeNull();
    expect(nasdaqThousands('')).toBeNull();
  });

  it('orders reported quarters oldest first and adds the next estimate', () => {
    const q = epsQuarters(
      [
        { fiscalQtrEnd: 'Jun 2026', dateReported: '8/10/2026', eps: 0.04, consensusForecast: '0.03' },
        { fiscalQtrEnd: 'Sep 2025', dateReported: '11/4/2025', eps: -0.06, consensusForecast: 'N/A' },
      ],
      [{ fiscalEnd: 'Sep 2026', consensusEPSForecast: 0.03 }, { fiscalEnd: 'Jun 2026', consensusEPSForecast: 0.03 }],
    );
    expect(q.map((x) => x.label)).toEqual(['Sep 2025', 'Jun 2026', 'Sep 2026']);
    expect(q[0].estimate).toBeNull();
    expect(q[2]).toMatchObject({ actual: null, estimate: 0.03, reported: null });
    expect(q[1].end).toBe('2026-06-30');
  });

  it('says beat, miss or met to the cent', () => {
    expect(verdict({ label: '', end: '', reported: null, estimate: 0.03, actual: 0.07 })).toEqual({ verdict: 'beat', diff: 0.04 });
    expect(verdict({ label: '', end: '', reported: null, estimate: -0.04, actual: -0.05 })?.verdict).toBe('miss');
    expect(verdict({ label: '', end: '', reported: null, estimate: 0.1, actual: 0.1 })?.verdict).toBe('met');
    expect(verdict({ label: '', end: '', reported: null, estimate: null, actual: 0.1 })).toBeNull();
  });

  it('takes revenue and common earnings from the income statement', () => {
    const p = revenuePeriods({
      headers: { value1: 'Quarterly Ending:', value2: '6/30/2026', value3: '3/31/2026' },
      rows: [
        { value1: 'Total Revenue', value2: '$319,716', value3: '$214,414' },
        { value1: 'Net Income', value2: '$14,255', value3: '-$76,945' },
        { value1: 'Net Income Applicable to Common Shareholders', value2: '$10,540', value3: '-$80,660' },
      ],
    });
    expect(p.map((x) => x.end)).toEqual(['2026-03-31', '2026-06-30']);
    expect(p[1]).toMatchObject({ revenue: 319_716_000, earnings: 10_540_000 });
    expect(margin(p[1])).toBeCloseTo(3.297, 2);
    expect(margin(p[0])!).toBeLessThan(0);
  });

  it('is null when nothing was reported', () => {
    expect(parseTrends('X', {})).toBeNull();
  });

  const entry = { source: 'wikidata' as const, currency: 'CHF', periods: [{ year: 2025, revenue: 89e9, earnings: 9e9 }, { year: 2024, revenue: 91e9, earnings: null }] };
  it('fills annual figures only where Nasdaq has no income statement', () => {
    expect(annualPeriods(entry).map((p) => p.label)).toEqual(['2024', '2025']);
    const none = withAnnual(null, entry, 'Nestlé', '');
    expect(none).toMatchObject({ symbol: '', company: 'Nestlé', currency: 'CHF', source: 'wikidata', quarterly: [] });
    const adr: EarningsTrends = { symbol: 'TSM', eps: [{ label: 'Jun 2026', end: '2026-06-30', reported: null, estimate: 1, actual: 2 }], quarterly: [], annual: [] };
    expect(withAnnual(adr, entry, 'TSMC', 'TSM')?.eps).toHaveLength(1);
    const full: EarningsTrends = { ...adr, quarterly: [{ label: 'Jun 2026', end: '2026-06-30', revenue: 1, earnings: 1 }] };
    expect(withAnnual(full, entry, 'X', 'TSM')?.currency).toBeUndefined();
    expect(withAnnual(null, null, 'X', '')).toBeNull();
  });
});
