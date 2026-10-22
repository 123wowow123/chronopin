'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/client/api';
import { useLocale } from '@/lib/client/i18n';
import { INTL_LOCALES } from '@/lib/i18n/config';

type Close = { day: string; close: number };
type Stock = { symbol: string; name: string | null; price: number; change: number | null; changePercent: number | null; closes: Close[] };

const VIEW = { w: 640, h: 160 };
const PAD = { top: 10, right: 8, bottom: 20, left: 46 };
const PLOT = { w: VIEW.w - PAD.left - PAD.right, h: VIEW.h - PAD.top - PAD.bottom };
const RANGES = [
  { key: '1M', days: 31 },
  { key: '6M', days: 183 },
  { key: '1Y', days: 366 },
] as const;

// A company's stock price on its search panel: the last year of daily closes,
// one line in the accent token, the range picked by chip, the exact close on
// hover. Nothing when the symbol has no Nasdaq listing.
export function StockPanel({ symbol }: { symbol: string }) {
  const [stock, setStock] = useState<Stock | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('6M');
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const locale = useLocale();
  const intl = INTL_LOCALES[locale as keyof typeof INTL_LOCALES] ?? 'en-US';

  useEffect(() => {
    let cancelled = false;
    setStock(null);
    api
      .get<Stock>(`/api/stocks/${encodeURIComponent(symbol)}`)
      .then((s) => !cancelled && setStock(s))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const days = RANGES.find((r) => r.key === range)!.days;
  const points = useMemo(() => {
    if (!stock) return [];
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    return stock.closes.filter((c) => c.day >= since);
  }, [stock, days]);
  const money = useMemo(() => new Intl.NumberFormat(intl, { style: 'currency', currency: 'USD' }), [intl]);
  const when = useMemo(() => new Intl.DateTimeFormat(intl, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }), [intl]);

  // The curve is drawn once per stock and range; hovering only moves the marker.
  const geo = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.close);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const x = (i: number) => PAD.left + (i / (points.length - 1)) * PLOT.w;
    const y = (v: number) => PAD.top + PLOT.h - ((v - min) / (max - min || 1)) * PLOT.h;
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.close).toFixed(1)}`).join(' ');
    const base = (PAD.top + PLOT.h).toFixed(1);
    return { min, max, x, y, line, area: `${line} L${x(points.length - 1).toFixed(1)} ${base} L${x(0).toFixed(1)} ${base} Z` };
  }, [points]);

  if (!stock || !geo) return null;
  const { min, max, x, y, line, area } = geo;
  const first = points[0].close;
  const last = points.at(-1)!.close;
  const delta = (last - first) / first;
  const shown = hover != null ? points[hover] : null;

  const at = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    setHover(Math.round(ratio * (points.length - 1)));
  };

  return (
    <figure className="rounded-lg border border-line bg-panel px-3 py-3">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-xs font-bold tracking-wider text-subtle uppercase">${stock.symbol}</span>
        <span className="text-sm text-ink tabular-nums">
          {money.format(shown ? shown.close : stock.price)}
          <span className="ms-2 text-xs text-subtle">{shown ? when.format(new Date(`${shown.day}T00:00:00Z`)) : null}</span>
          {!shown ? (
            <span className={`ms-2 text-xs ${delta < 0 ? 'text-danger' : 'text-success'}`}>
              {delta > 0 ? '+' : ''}
              {(delta * 100).toFixed(1)}% {range}
            </span>
          ) : null}
        </span>
      </figcaption>
      <svg
        ref={svg}
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={`${stock.symbol} closing price, ${points[0].day} to ${points.at(-1)!.day}: low ${money.format(min)}, high ${money.format(max)}`}
        onPointerMove={at}
        onPointerLeave={() => setHover(null)}
      >
        <path d={area} className="fill-accent/12" />
        <path d={line} className="stroke-accent" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {shown ? (
          <g>
            <line x1={x(hover!)} x2={x(hover!)} y1={PAD.top} y2={PAD.top + PLOT.h} className="stroke-subtle" strokeWidth="1" />
            <circle cx={x(hover!)} cy={y(shown.close)} r="4.5" className="fill-accent stroke-panel" strokeWidth="2" />
          </g>
        ) : null}
        <text x={PAD.left - 8} y={PAD.top + 4} textAnchor="end" className="fill-current text-[11px] text-faint tabular-nums">{Math.round(max)}</text>
        <text x={PAD.left - 8} y={PAD.top + PLOT.h} textAnchor="end" className="fill-current text-[11px] text-faint tabular-nums">{Math.round(min)}</text>
        <text x={PAD.left} y={VIEW.h - 5} className="fill-current text-[11px] text-faint">{points[0].day.slice(0, 7)}</text>
        <text x={PAD.left + PLOT.w} y={VIEW.h - 5} textAnchor="end" className="fill-current text-[11px] text-faint">{points.at(-1)!.day.slice(0, 7)}</text>
      </svg>
      <div className="mt-1 flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            aria-pressed={range === r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ${range === r.key ? 'bg-field font-semibold text-ink ring-accent' : 'text-muted ring-line'}`}
          >
            {r.key}
          </button>
        ))}
      </div>
    </figure>
  );
}
