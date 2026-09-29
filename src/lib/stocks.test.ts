import { describe, expect, it } from 'vitest';
import {
  closeKnown,
  closeOf,
  closeOnOrBefore,
  isCompanyListing,
  MAX_PIN_TICKERS,
  marketDayOf,
  nasdaqChartInstant,
  nasdaqDay,
  nasdaqNumber,
  normalizeSymbol,
  parseScrapedStocks,
  priceAt,
  shortCompanyName,
  stockTidbit,
  startMarketDay,
} from './stocks';

const closes = [
  { day: '2026-09-10', close: 100 },
  { day: '2026-09-11', close: 101 },
  { day: '2026-09-14', close: 104 },
];

describe('market time', () => {
  it('closes at 4 PM New York, summer and winter', () => {
    expect(closeOf('2026-09-11').toISOString()).toBe('2026-09-11T20:00:00.000Z');
    expect(closeOf('2026-12-11').toISOString()).toBe('2026-12-11T21:00:00.000Z');
  });

  it('reads the day in New York', () => {
    expect(marketDayOf(new Date('2026-09-12T02:00:00Z'))).toBe('2026-09-11');
  });

  it('takes an all-day pin as its own day and a timed one in New York', () => {
    expect(startMarketDay('2026-09-30T00:00:00Z', true)).toBe('2026-09-30');
    expect(startMarketDay('2026-09-30T00:00:00Z', false)).toBe('2026-09-29');
  });

  it('knows a close only after it has settled', () => {
    expect(closeKnown('2026-09-11', new Date('2026-09-11T20:10:00Z'))).toBe(false);
    expect(closeKnown('2026-09-11', new Date('2026-09-11T20:31:00Z'))).toBe(true);
  });

  it('reads a chart x as New York wall time', () => {
    // "4:00 AM ET" on 2026-09-18 is written as 04:00Z.
    expect(nasdaqChartInstant(Date.UTC(2026, 8, 18, 4, 0)).toISOString()).toBe('2026-09-18T08:00:00.000Z');
  });
});

describe('choosing a price', () => {
  it('takes the close on the day, or the last one before a weekend', () => {
    expect(closeOnOrBefore(closes, '2026-09-11')?.close).toBe(101);
    expect(closeOnOrBefore(closes, '2026-09-13')?.close).toBe(101);
    expect(closeOnOrBefore(closes, '2026-09-01')).toBeNull();
  });

  it('prices a moment by the last close before it', () => {
    // Posted Friday at noon: Thursday's close was the last known price.
    expect(priceAt(new Date('2026-09-11T16:00:00Z'), closes)).toEqual({ price: 100, at: '2026-09-10T20:00:00.000Z' });
    // Posted Friday evening: Friday's close.
    expect(priceAt(new Date('2026-09-11T23:00:00Z'), closes)?.price).toBe(101);
  });

  it('prefers an intraday point after the last close', () => {
    const intraday = [
      { at: new Date('2026-09-11T15:00:00Z'), price: 99.5 },
      { at: new Date('2026-09-11T16:30:00Z'), price: 99 },
    ];
    expect(priceAt(new Date('2026-09-11T16:00:00Z'), closes, intraday)).toEqual({ price: 99.5, at: '2026-09-11T15:00:00.000Z' });
  });
});

describe('Nasdaq', () => {
  it('reads its numbers and dates', () => {
    expect(nasdaqNumber('$1,493.78')).toBe(1493.78);
    expect(nasdaqNumber('-0.80%')).toBe(-0.8);
    expect(nasdaqNumber('N/A')).toBeNull();
    expect(nasdaqDay('09/18/2026')).toBe('2026-09-18');
  });

  it('matches a company only to its own stock', () => {
    expect(isCompanyListing('Sony', { name: 'Sony Group Corporation American Depositary Shares', asset: 'STOCKS' })).toBe(true);
    expect(isCompanyListing('Apple', { name: 'Apple Inc. Common Stock', asset: 'STOCKS' })).toBe(true);
    expect(isCompanyListing('Apple', { name: 'Apple Hospitality REIT, Inc. Common Shares', asset: 'STOCKS' })).toBe(false);
    expect(isCompanyListing('OpenAI', { name: 'OpenAI Lab Ecosystem ETF', asset: 'ETF' })).toBe(false);
    expect(isCompanyListing('Meta', { name: 'Metallus Inc. Common Stock', asset: 'STOCKS' })).toBe(false);
    expect(isCompanyListing('Brightline', { name: 'Brightline Interactive, Inc. Common Stock', asset: 'STOCKS' })).toBe(false);
    expect(isCompanyListing('Dell', { name: 'Dell Technologies Inc. Class C Common Stock', asset: 'STOCKS' })).toBe(true);
  });

  it('takes a ticker as typed', () => {
    expect(normalizeSymbol(' $msft ')).toBe('MSFT');
    expect(normalizeSymbol('BRK.B')).toBe('BRK.B');
    expect(normalizeSymbol('not a ticker')).toBeNull();
  });
});

describe('parseScrapedStocks', () => {
  it('cleans what a body sends and drops the rest', () => {
    expect(
      parseScrapedStocks([
        { symbol: '$msft', name: ' Microsoft ', relation: 'related', note: 'Investor' },
        { symbol: 'MSFT', relation: 'supplier' },
        { symbol: 'not a ticker' },
        { symbol: 'nvda', relation: 'owner' },
        'AAPL',
        null,
      ]),
    ).toEqual([
      { symbol: 'MSFT', name: 'Microsoft', relation: 'related', note: 'Investor' },
      { symbol: 'NVDA', name: null, relation: 'related', note: null },
    ]);
    expect(parseScrapedStocks(undefined)).toEqual([]);
  });

  it('keeps at most MAX_PIN_TICKERS', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ symbol: `A${i}`, relation: 'related' }));
    expect(parseScrapedStocks(many)).toHaveLength(MAX_PIN_TICKERS);
  });
});

describe('stock tidbits', () => {
  it('shortens listing names', () => {
    expect(shortCompanyName('Apple Inc. Common Stock')).toBe('Apple');
    expect(shortCompanyName('Sony Group Corporation American Depositary Shares')).toBe('Sony');
    expect(shortCompanyName('Advanced Micro Devices, Inc.')).toBe('Advanced Micro Devices');
    expect(shortCompanyName('TSMC')).toBe('TSMC');
  });

  it('reads as one line', () => {
    expect(stockTidbit({ symbol: 'AAPL', name: 'Apple Inc.', relation: 'related', note: "the biggest customer for Sony's camera image sensors" })).toBe(
      "Related: Apple (AAPL), the biggest customer for Sony's camera image sensors.",
    );
    expect(stockTidbit({ symbol: 'AMD', name: 'AMD', relation: 'supplier', note: 'which designs the PlayStation 5 processor.' })).toBe(
      'Supplier: AMD, which designs the PlayStation 5 processor.',
    );
    expect(stockTidbit({ symbol: 'MSFT', name: 'Microsoft Corporation', relation: 'related', note: "OpenAI's largest investor" })).toBe(
      "Related: Microsoft (MSFT), OpenAI's largest investor.",
    );
    expect(stockTidbit({ symbol: 'SONY', name: 'Sony', relation: 'company', note: null })).toBe('Company: Sony (SONY).');
    expect(stockTidbit({ symbol: 'NVDA', name: 'NVIDIA Corporation', relation: 'supplier', note: 'which supplies its GPUs' })).toBe(
      'Supplier: NVIDIA (NVDA), which supplies its GPUs.',
    );
  });
});
