// How prediction markets fared against what happened, for the track record at
// /predictions. Types and arithmetic only, shared by the server and the page.
//
// A market's outcomes are scored as binary forecasts: an outcome priced at p
// that settled yes (1) or no (0). A plain yes/no question is one forecast (its
// leading side), not two, which would count the same bet twice.

export type OutcomeOdds = { label: string; probability: number | null };

// A settled price at least this close to 1 is a win, at most 1 minus it a loss;
// anything between is a market that did not settle cleanly.
const SETTLED = 0.99;

export type Forecast = { label: string; probability: number; won: boolean };

// The outcomes of a market worth scoring, from its odds when first read.
export function forecastLabels(outcomes: OutcomeOdds[]): { label: string; probability: number }[] {
  const priced = outcomes.filter((o): o is { label: string; probability: number } => o.probability != null);
  if (priced.length <= 2) return priced.slice().sort((a, b) => b.probability - a.probability).slice(0, 1);
  return priced;
}

// 'resolved' when some outcome settled decisively yes, else 'void' (a market
// that closed at 50-50, cancelled, or whose sides all settled no).
export function settlement(finalOutcomes: OutcomeOdds[]): 'resolved' | 'void' {
  return finalOutcomes.some((o) => (o.probability ?? 0) >= SETTLED) ? 'resolved' : 'void';
}

// Each forecast of a market with what it settled at. An outcome absent from
// the settled list, or one that did not settle decisively, is left out.
export function scoreMarket(outcomes: OutcomeOdds[], finalOutcomes: OutcomeOdds[]): Forecast[] {
  const settled = new Map(finalOutcomes.map((o) => [o.label, o.probability]));
  const forecasts: Forecast[] = [];
  for (const o of forecastLabels(outcomes)) {
    const final = settled.get(o.label);
    if (final == null) continue;
    if (final >= SETTLED) forecasts.push({ label: o.label, probability: o.probability, won: true });
    else if (final <= 1 - SETTLED) forecasts.push({ label: o.label, probability: o.probability, won: false });
  }
  return forecasts;
}

export type CalibrationBucket = {
  // Lower edge of the bucket, 0-1; it spans [from, from + width).
  from: number;
  to: number;
  count: number;
  // What the market said on average, and how often it came true; both 0-1.
  meanProbability: number;
  hitRate: number;
};

export type AccuracySummary = {
  markets: number;
  forecasts: number;
  // The mean squared error of the odds (0 perfect, 0.25 for always saying 50%).
  brier: number | null;
  // How often the market's favorite settled yes.
  favoriteHitRate: number | null;
  favoriteCount: number;
  buckets: CalibrationBucket[];
};

export const BUCKET_WIDTH = 0.2;

export function calibration(forecasts: Forecast[]): CalibrationBucket[] {
  const count = Math.round(1 / BUCKET_WIDTH);
  const rows = Array.from({ length: count }, (_, i) => ({ n: 0, p: 0, won: 0, i }));
  for (const f of forecasts) {
    const row = rows[Math.min(count - 1, Math.floor(f.probability / BUCKET_WIDTH))];
    row.n++;
    row.p += f.probability;
    row.won += f.won ? 1 : 0;
  }
  return rows
    .filter((r) => r.n > 0)
    .map((r) => ({
      from: r.i * BUCKET_WIDTH,
      to: (r.i + 1) * BUCKET_WIDTH,
      count: r.n,
      meanProbability: r.p / r.n,
      hitRate: r.won / r.n,
    }));
}

// markets: one entry per settled market, with its scored forecasts and which
// of them was the favorite (the highest-priced outcome when first read).
export function summarize(markets: { forecasts: Forecast[]; favoriteWon: boolean | null }[]): AccuracySummary {
  const all = markets.flatMap((m) => m.forecasts);
  const favorites = markets.filter((m) => m.favoriteWon != null);
  return {
    markets: markets.filter((m) => m.forecasts.length > 0).length,
    forecasts: all.length,
    brier: all.length ? all.reduce((sum, f) => sum + (f.probability - (f.won ? 1 : 0)) ** 2, 0) / all.length : null,
    favoriteHitRate: favorites.length ? favorites.filter((m) => m.favoriteWon).length / favorites.length : null,
    favoriteCount: favorites.length,
    buckets: calibration(all),
  };
}

// Whether a market's favorite (its leading outcome when first read) settled
// yes; null when it did not settle decisively.
export function favoriteWon(outcomes: OutcomeOdds[], finalOutcomes: OutcomeOdds[]): boolean | null {
  const [favorite] = outcomes.filter((o) => o.probability != null).sort((a, b) => b.probability! - a.probability!);
  if (!favorite) return null;
  const final = finalOutcomes.find((o) => o.label === favorite.label)?.probability;
  if (final == null) return null;
  if (final >= SETTLED) return true;
  return final <= 1 - SETTLED ? false : null;
}
