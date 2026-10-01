import { describe, expect, it } from 'vitest';
import { foldStories, kalshiShortlist } from './markets';

const kalshi = (ticker: string, volume = 1000) => ({ ticker, series: ticker.split('-')[0], markets: 1, volume, volume24h: 0, closes: '2026-10-05T00:00:00Z', listed: '2026-09-01T00:00:00Z' });

describe('kalshiShortlist', () => {
  it('drops recurring series, price ladders and props, and keeps one-off events', () => {
    const events = [
      kalshi('KXNFLGAME-26OCT05ATLNO'),
      kalshi('KXNFLGAME-26OCT05DALHOU'),
      kalshi('KXNFLGAME-26OCT05ARINYG'),
      kalshi('KXNFLSPREAD-26OCT05ATLNO'),
      kalshi('KXBTCD-26OCT0217'),
      kalshi('KXGEMINIAPP-26OCT08'),
      kalshi('KXCAVAFT-26OCT08'),
      kalshi('KXHORMUZWEEKLY-26OCT04'),
      kalshi('KXNFLDRAFT-27'),
      kalshi('KXBOXING-26OCT03MAYPAC'),
      kalshi('KXPAYROLLS-26SEP'),
    ];
    expect(kalshiShortlist(events).map((e) => e.ticker)).toEqual(['KXNFLDRAFT-27', 'KXBOXING-26OCT03MAYPAC', 'KXPAYROLLS-26SEP']);
  });
});

describe('foldStories', () => {
  const poly = (title: string, endDate: string, ...tags: string[]) => ({ title, endDate, tags: tags.map((slug) => ({ slug })) });

  it("folds an election's races into its biggest market, and leaves other stories alone", () => {
    const folded = foldStories([
      poly('Brazil Presidential Election', '2026-10-05T03:59:00Z', 'politics', 'brazil'),
      poly('Quebec General Election Winner', '2026-10-06T03:59:00Z', 'politics', 'world-elections'),
      poly('Sao Paulo Governor', '2026-10-05T03:59:00Z', 'brazil', 'elections'),
      poly('Renan Santos vote share', '2026-10-04T23:59:00Z', 'world', 'brazil'),
      poly('Brazil runoff winner', '2026-10-26T03:59:00Z', 'brazil'),
    ]);
    expect(folded.map((f) => [f.event.title, f.related])).toEqual([
      ['Brazil Presidential Election', ['Sao Paulo Governor', 'Renan Santos vote share']],
      ['Quebec General Election Winner', []],
      ['Brazil runoff winner', []],
    ]);
  });
});
