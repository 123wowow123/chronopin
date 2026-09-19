import { describe, expect, it } from 'vitest';
import { impliedScore, readScoreEvent, scoreSiteFor, settledScore, withScoreMarket, type ScoreMarket } from './scoreMarkets';

// An "Above N" market as Kalshi's API returns it.
const above = (strike: number, bid: number, ask: number, extra: Record<string, unknown> = {}) => ({
  ticker: `KXRT-RES-${strike}`,
  strike_type: 'greater',
  floor_strike: strike,
  yes_bid_dollars: String(bid),
  yes_ask_dollars: String(ask),
  close_time: '2026-09-21T14:00:00Z',
  ...extra,
});

describe('impliedScore', () => {
  it('reads the expected score off the ladder', () => {
    // Resident Evil on 2026-09-19: near certain above 93, 20% above 95.
    const ladder = [above(45, 0.99, 1), above(90, 0.99, 1), above(93, 0.97, 0.99), above(94, 0.79, 0.88), above(95, 0.2, 0.21), above(96, 0, 0.01)];
    expect(impliedScore(ladder)).toBe(95);
  });

  it('centres on the strike priced at a coin flip', () => {
    expect(impliedScore([above(50, 0.95, 0.97), above(60, 0.49, 0.51), above(70, 0.03, 0.05)])).toBe(60);
  });

  it('makes a thin book fall as the strike rises', () => {
    const noisy = impliedScore([above(60, 0.9, 0.92), above(70, 0.4, 0.44), above(80, 0.6, 0.62), above(90, 0.05, 0.07)]);
    const smooth = impliedScore([above(60, 0.9, 0.92), above(70, 0.51, 0.53), above(80, 0.51, 0.53), above(90, 0.05, 0.07)]);
    expect(noisy).toBe(smooth);
  });

  it('prefers a tight quote to a stale last trade, and needs some price', () => {
    expect(impliedScore([above(50, 0.48, 0.52, { last_price_dollars: '0.99' })])).toBe(impliedScore([above(50, 0.48, 0.52)]));
    expect(impliedScore([{ strike_type: 'greater', floor_strike: 50 }])).toBeUndefined();
  });
});

describe('settledScore', () => {
  it('takes the expiration value, else a yes/no pair one apart', () => {
    expect(settledScore([{ result: 'yes', floor_strike: 50, expiration_value: '52' }])).toBe(52);
    expect(settledScore([{ result: 'yes', floor_strike: 51 }, { result: 'no', floor_strike: 52 }])).toBe(52);
    expect(settledScore([{ result: 'yes', floor_strike: 50 }, { result: 'no', floor_strike: 54 }])).toBeUndefined();
  });
});

describe('readScoreEvent', () => {
  const event = (markets: unknown[]) => ({
    event_ticker: 'KXRT-UPR',
    series_ticker: 'KXRT',
    sub_title: 'The Uprising',
    settlement_sources: [{ name: 'Rotten Tomatoes', url: 'https://www.rottentomatoes.com/m/the_uprising_2026' }],
    markets,
  });

  it('gives a settled event the site score and page', () => {
    const settled = readScoreEvent(event([above(50, 0, 0, { result: 'yes', expiration_value: '52' }), above(54, 0, 0, { result: 'no', expiration_value: '52' })]), 'Rotten Tomatoes');
    expect(settled).toMatchObject({
      settled: true,
      score: 52,
      title: 'The Uprising',
      siteUrl: 'https://www.rottentomatoes.com/m/the_uprising_2026',
      url: 'https://kalshi.com/markets/kxrt/rotten-tomatoes-scores/kxrt-upr',
    });
  });

  it('is not a score without "Above N" markets', () => {
    expect(readScoreEvent(event([{ strike_type: 'custom', yes_bid_dollars: '0.5' }]), 'Rotten Tomatoes')).toBeUndefined();
    expect(readScoreEvent(event([]), 'Rotten Tomatoes')).toBeUndefined();
  });
});

describe('withScoreMarket', () => {
  const market: ScoreMarket = { site: 'Rotten Tomatoes', eventTicker: 'KXRT-RES', title: 'Resident Evil', url: 'https://kalshi.com/x', settled: false, score: 95 };

  it('adds an open market as a forecast, not as the site', () => {
    expect(withScoreMarket([], market)).toEqual([{ source: 'Kalshi RT forecast', score: 95, scoreMax: 100, url: 'https://kalshi.com/x' }]);
  });

  it('adds a settled one as the site, unless the site already scored it', () => {
    expect(withScoreMarket([], { ...market, settled: true, siteUrl: 'https://rt/m/x' })[0]).toMatchObject({ source: 'Rotten Tomatoes', url: 'https://rt/m/x' });
    const wikidata = [{ source: 'Rotten Tomatoes', score: 90, scoreMax: 100 }];
    expect(withScoreMarket(wikidata, market)).toBe(wikidata);
    expect(withScoreMarket(wikidata, { ...market, settled: true })).toBe(wikidata);
  });
});

describe('scoreSiteFor', () => {
  it('bets Rotten Tomatoes on screen categories and Metacritic on games', () => {
    expect(scoreSiteFor('Movies')).toBe('Rotten Tomatoes');
    expect(scoreSiteFor('tv series')).toBe('Rotten Tomatoes');
    expect(scoreSiteFor('Gaming & Entertainment')).toBe('Metacritic');
    expect(scoreSiteFor('Sports')).toBeUndefined();
  });
});
