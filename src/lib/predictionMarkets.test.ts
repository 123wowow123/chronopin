import { describe, expect, it } from 'vitest';
import { parseMarketUrl, pinMarketRefs, totalMarketVolume } from './predictionMarkets';

describe('parseMarketUrl', () => {
  it('reads Polymarket US event links, apart from polymarket.com ones', () => {
    expect(parseMarketUrl('https://polymarket.us/event/usho-midterms-2026-11-03')).toEqual({
      source: 'Polymarket US',
      kind: 'event',
      slug: 'usho-midterms-2026-11-03',
      url: 'https://polymarket.us/event/usho-midterms-2026-11-03',
    });
    expect(parseMarketUrl('https://www.polymarket.us/category/politics')).toBeNull();
    expect(parseMarketUrl('https://polymarket.com/event/balance-of-power-2026-midterms')).toMatchObject({ source: 'Polymarket', kind: 'event' });
  });

  it('keeps the same slug on the two exchanges as two markets', () => {
    const refs = pinMarketRefs({ sourceUrl: 'https://polymarket.com/event/same-slug', references: [{ url: 'https://polymarket.us/event/same-slug' }] });
    expect(refs.map((ref) => ref.source)).toEqual(['Polymarket', 'Polymarket US']);
  });
});

describe('totalMarketVolume', () => {
  it('adds up what the markets report and passes over what they do not', () => {
    expect(totalMarketVolume([{ volume: 1_500 }, {}, { volume: 500 }])).toBe(2_000);
    expect(totalMarketVolume([{}, {}])).toBe(0);
    expect(totalMarketVolume([])).toBe(0);
  });
});
