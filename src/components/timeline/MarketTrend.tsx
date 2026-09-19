'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useMarketOdds, watchMarketOdds } from '@/lib/client/marketOdds';
import type { MarketTrend as Trend } from '@/lib/predictionMarkets';
import { useT } from '@/lib/client/i18n';

// The tile's drawing box, in the pixels it is shown at (h-9 w-14).
const W = 56;
const H = 36;
// The line keeps clear of the percentage above it and the tile's edges.
const TOP = 15;
const BOTTOM = H - 4;
const INSET = 3;

// One request per pin for the page's life: the history moves by the hour, and
// the value that moves by the minute arrives over the live stream.
const requests = new Map<number, Promise<Trend | null>>();

function loadTrend(pinId: number): Promise<Trend | null> {
  let request = requests.get(pinId);
  if (!request) {
    request = fetch(`/api/pins/${pinId}/trend`)
      .then((res) => (res.status === 200 ? (res.json() as Promise<Trend>) : null))
      .catch(() => {
        requests.delete(pinId);
        return null;
      });
    requests.set(pinId, request);
  }
  return request;
}

// A week of hourly prices is ~170 points for ~50px, and a price flicking a cent
// each hour draws as a saw. Averaged into this many steps (6 hours each), the
// line shows the week's drift instead.
const STEPS = 28;

function smooth(points: [number, number][]): [number, number][] {
  const [t0, t1] = [points[0][0], points[points.length - 1][0]];
  const span = Math.max(t1 - t0, 1);
  const sums = Array.from({ length: STEPS }, () => ({ t: 0, p: 0, n: 0 }));
  for (const [t, p] of points) {
    const step = sums[Math.min(STEPS - 1, Math.floor(((t - t0) / span) * STEPS))];
    step.t += t;
    step.p += p;
    step.n += 1;
  }
  return sums.filter((s) => s.n).map((s) => [s.t / s.n, s.p / s.n]);
}

function percent(chance: number): string {
  const p = chance * 100;
  if (p > 0 && p < 1) return '<1%';
  if (p < 100 && p > 99) return '>99%';
  return `${Math.round(p)}%`;
}

// A pin's picture in a list, for a pin that cites a prediction market: its
// leading outcome's chance over the past week as a line, ending on the live
// value, with that value above it. Until the week has loaded it holds the
// picture's place; a pin whose market has no history shows fallback instead.
export function MarketTrend({ pinId, fallback }: { pinId: number; fallback: ReactNode }) {
  const [trend, setTrend] = useState<Trend | null | undefined>(undefined);
  const markets = useMarketOdds(pinId);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    loadTrend(pinId).then((loaded) => !cancelled && setTrend(loaded));
    return () => {
      cancelled = true;
    };
  }, [pinId]);
  useEffect(() => watchMarketOdds(pinId), [pinId]);

  if (trend === null) return fallback;
  if (!trend) return <span aria-hidden className="block h-9 w-14 shrink-0 animate-pulse rounded bg-raised-2 motion-reduce:animate-none" />;

  // The same outcome as it is right now, when the stream has it.
  const market = markets?.find((m) => m.source === trend.source);
  const live = market?.outcomes.find((o) => o.label === trend.label)?.probability;
  const liveAt = market ? Date.parse(market.fetchedAt) / 1000 : NaN;
  const week = smooth(trend.points);
  const points: [number, number][] = live == null || !(liveAt > trend.points[trend.points.length - 1][0]) ? week : [...week, [liveAt, live]];
  const current = points[points.length - 1][1];

  const [t0, t1] = [points[0][0], points[points.length - 1][0]];
  const chances = points.map(([, p]) => p);
  // A flat week still gets a band to sit in, so a small move is not blown up.
  const low = Math.min(...chances);
  const high = Math.max(...chances);
  const pad = Math.max((high - low) * 0.15, 0.02);
  const [min, max] = [Math.max(0, low - pad), Math.min(1, high + pad)];
  const x = (t: number) => INSET + ((t - t0) / Math.max(t1 - t0, 1)) * (W - INSET * 2);
  const y = (p: number) => BOTTOM - ((p - min) / Math.max(max - min, 1e-6)) * (BOTTOM - TOP);
  const line = points.map(([t, p], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(p).toFixed(1)}`).join('');
  const area = `${line}L${x(t1).toFixed(1)},${H}L${x(t0).toFixed(1)},${H}Z`;
  const change = current - points[0][1];
  const summary = t(change >= 0 ? 'odds.trendUp' : 'odds.trendDown', { label: trend.label, percent: percent(current), source: trend.source, points: Math.abs(Math.round(change * 100)) });

  return (
    <span role="img" aria-label={summary} title={`${trend.title}\n${summary}`} className="relative block h-9 w-14 shrink-0 overflow-hidden rounded bg-raised-2">
      <span className="absolute top-0.5 left-1 text-[10px] leading-none font-semibold text-ink tabular-nums">{percent(current)}</span>
      <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full">
        <path d={area} className="fill-link/15" />
        <path d={line} fill="none" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" className="stroke-link" />
        <circle cx={x(t1)} cy={y(current)} r={2} className="fill-link" />
      </svg>
    </span>
  );
}
