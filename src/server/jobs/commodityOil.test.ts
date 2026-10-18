import { describe, expect, it, vi } from 'vitest';
import {
  fetchBrentAndWtiCommodityMarkets,
  getExistingMonthlyOilPins,
  syncMonthlyOilCommodities,
} from './commodityOil';
import { kalshiShortlist } from './markets';
import * as db from '../db';

describe('commodityOil', () => {
  it('preserves monthly Brent and WTI series in kalshiShortlist', () => {
    const events = [
      { ticker: 'KXBRENTMON-26OCT3017', series: 'KXBRENTMON', markets: 30, volume: 100000, volume24h: 1000, closes: '2026-10-30T21:00:00Z', listed: '2026-10-01' },
      { ticker: 'KXWTIMONTHLY-26OCT30', series: 'KXWTIMONTHLY', markets: 30, volume: 80000, volume24h: 800, closes: '2026-10-30T21:00:00Z', listed: '2026-10-01' },
      { ticker: 'KXBRENTD-26OCT16', series: 'KXBRENTD', markets: 10, volume: 5000, volume24h: 500, closes: '2026-10-16T21:00:00Z', listed: '2026-10-15' },
      { ticker: 'KXWTI15M-26OCT160145', series: 'KXWTI15M', markets: 5, volume: 200, volume24h: 20, closes: '2026-10-16T01:45:00Z', listed: '2026-10-16' },
    ];

    const kept = kalshiShortlist(events as any);
    const seriesKept = kept.map((e) => e.series);

    expect(seriesKept).toContain('KXBRENTMON');
    expect(seriesKept).toContain('KXWTIMONTHLY');
    expect(seriesKept).not.toContain('KXBRENTD');
    expect(seriesKept).not.toContain('KXWTI15M');
  });

  it('fetches and structures monthly Brent and WTI commodity contracts', async () => {
    const markets = await fetchBrentAndWtiCommodityMarkets();

    expect(markets.length).toBeGreaterThan(0);
    const brent = markets.filter((m) => m.commodity === 'Brent');
    const wti = markets.filter((m) => m.commodity === 'WTI');

    expect(brent.length).toBeGreaterThan(0);
    expect(wti.length).toBeGreaterThan(0);

    for (const m of markets) {
      expect(m.title).toBeDefined();
      expect(m.monthKey).toMatch(/^\d{4}-\d{2}$/);
      expect(['predicted', 'realized']).toContain(m.status);
      expect(m.tags).toContain('Predicted');
      expect(m.tags).toContain('Commodities');
      expect(m.categories).toContain('Energy');
      expect(m.reasoning.length).toBeGreaterThan(20);
      expect(m.dateConfidenceReasoning.length).toBeGreaterThan(20);

      if (m.status === 'predicted') {
        expect(m.dateConfidence).toBe('estimated');
        expect(m.dateConfidenceReasoning).toContain('Estimated:');
      } else {
        expect(m.dateConfidence).toBe('confirmed');
        expect(m.dateConfidenceReasoning).toContain('Confirmed:');
        expect(m.realizedPrice).toBeGreaterThan(0);
      }
    }
  });

  it('correctly maps existing monthly pins and creates threads via parentId', async () => {
    vi.spyOn(db, 'query').mockImplementation(async (sql: string, params?: unknown[]) => {
      if (typeof sql === 'string' && sql.includes('Brent Crude Oil %')) {
        return [
          {
            id: 100,
            title: 'Brent Crude Oil Settlement — August 2026: $90.75/bbl',
            parentId: null,
            dateConfidence: 'confirmed',
            utcStartDateTime: new Date('2026-08-31T21:00:00Z'),
          },
          {
            id: 101,
            title: 'Brent Crude Oil Settlement — September 2026: $97.92/bbl',
            parentId: 100,
            dateConfidence: 'confirmed',
            utcStartDateTime: new Date('2026-09-30T21:00:00Z'),
          },
        ] as any;
      }
      return [] as any;
    });

    const existingMap = await getExistingMonthlyOilPins();
    expect(existingMap.has('Brent:2026-08')).toBe(true);
    expect(existingMap.has('Brent:2026-09')).toBe(true);
    expect(existingMap.get('Brent:2026-09')?.parentId).toBe(100);

    vi.restoreAllMocks();
  });
});
