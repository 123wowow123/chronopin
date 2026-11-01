import { preferredHoldings, type HoldingsSnapshot } from '@/lib/holdings';
import { placeHoldings, worthFetching, type MapPoint, type Unplaced } from '@/lib/holdingsMap';
import { UNRATED, type Iv15Point } from '@/lib/iv15Map';
import { loadRatios } from './holdingsMap';
import { loadHurdle } from './hurdle';
import { iv15PointsFor } from './iv15';

export type ValuationMaps = {
  // One weight-by-52-week-high map for each portfolio with a weighted ticker.
  maps: { key: string; name: string; placed: MapPoint[]; unplaced: Unplaced[] }[];
  // Published IV15 points (when on file) plus a C-IV15 estimate for every stock that can be valued.
  iv15: Iv15Point[];
};

// Whether a person has anything to map at all, without fetching a price.
export function hasValuationMaps(holdings: HoldingsSnapshot[], name: string): boolean {
  return holdings.some(p => p.holdings.some(worthFetching)) || iv15PointsFor(name).length > 0;
}

export async function buildValuationMaps(holdings: HoldingsSnapshot[], name: string): Promise<ValuationMaps> {
  const published = iv15PointsFor(name);
  const candidates = preferredHoldings(holdings).filter(p => p.holdings.some(worthFetching));
  const held = candidates.flatMap(p => p.holdings.filter(worthFetching).filter(h => h.side === 'long').map(h => h.symbol));
  // C-IV15, Chronopin's own estimate, is made for every stock on the chart:
  // each one rated by the analyst, and each held long that is not rated.
  const symbols = [...new Set([...published.map(q => q.symbol), ...held])];
  const [ratios, hurdles] = await Promise.all([
    loadRatios(candidates.flatMap(p => p.holdings.filter(worthFetching).map(h => h.symbol))),
    Promise.all(symbols.map(loadHurdle)),
  ]);
  const names = new Map([...candidates.flatMap(p => p.holdings.map(h => [h.symbol, h.name] as const)), ...published.map(q => [q.symbol, q.name] as const)]);
  const estimates: Iv15Point[] = hurdles.flatMap(h => h ? [{
    symbol: h.symbol, name: names.get(h.symbol) ?? h.symbol, // The estimate sits in the published tier's column when there is one, else in the tier Chronopin assigns.
    tier: published.find(q => q.symbol === h.symbol)?.tier ?? h.tier ?? UNRATED, estimate: true,
    // Placed beside the published bubble, at the price used in the post, so the two compare on one date.
    price: published.find(q => q.symbol === h.symbol)?.price ?? h.price, iv15Low: h.hurdle.price, iv15High: null, score: h.score, held: held.includes(h.symbol), asOf: h.fiscalYearEnd,
    sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${h.cik}&type=10-K`,
    // What was done differently for this stock, shown in the tooltip.
    note: [h.stockCompWeight < 1 ? `${Math.round(h.stockCompWeight * 100)}% stock pay` : '', h.leveraged ? 'debt not deducted' : '', h.sharesFromMarketCap ? 'shares from market cap' : '', h.convertedFrom ? `converted from ${h.convertedFrom}` : '', Date.now() - Date.parse(h.fiscalYearEnd) > 456 * 864e5 ? `latest filing: year ended ${h.fiscalYearEnd}` : ''].filter(Boolean).join(', ') || null,
  }] : []);
  const maps = candidates
    .map(p => ({ key: p.key, name: p.name, ...placeHoldings(p.holdings.map(holding => ({ holding, ratio: ratios.get(holding.symbol) ?? null }))) }))
    .filter(m => m.placed.length);
  return { maps, iv15: [...published, ...estimates] };
}
