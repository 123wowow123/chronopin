'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useT } from '@/lib/client/i18n';
import { INTL_LOCALES } from '@/lib/i18n/config';
import type { PinSeriesData, SeriesPoint } from '@/lib/series';
import { loadPinSeries, seriesExtent, sizeOf } from '@/lib/series';

// The publisher's own chart on the pin: one weekly series with the pin's week
// marked, so the event is read against the curve it moved. Nothing when the
// pin has no series.
//
// One series, so no legend - the heading names it - and no categorical
// palette: the line wears the accent token and the pin's own week wears the
// "past" token, which is a different job, not a second series. Text stays in
// the ink tokens throughout; the numbers never take the line's colour. Both
// tokens are redefined per theme in globals.css, so dark mode is the design
// system's own step rather than a flipped colour.
//
// The values themselves are the publisher's table, one click away on its own
// page - that link is the accessible table view for this chart, and it is
// always shown.

const VIEW = { w: 640, h: 180 };
const PAD = { top: 12, right: 8, bottom: 22, left: 42 };
const PLOT = { w: VIEW.w - PAD.left - PAD.right, h: VIEW.h - PAD.top - PAD.bottom };
const GRID_LINES = 3;

type Hover = { point: SeriesPoint; x: number; y: number } | null;

export function PinSeriesChart({ pinId, has }: { pinId: number; has: boolean }) {
  const [series, setSeries] = useState<PinSeriesData[] | null>(null);
  const t = useT();
  const locale = useLocale();

  useEffect(() => {
    if (!has) return;
    let cancelled = false;
    loadPinSeries(pinId).then((data) => {
      if (!cancelled && data?.length) setSeries(data);
    });
    return () => {
      cancelled = true;
    };
  }, [pinId, has]);

  if (!series) return null;
  return (
    <div className="mt-4 flex flex-col gap-4">
      {series.map((s) => (
        <OneSeries key={`${s.source}:${s.seriesId}`} series={s} locale={locale} t={t} />
      ))}
    </div>
  );
}

function OneSeries({ series, locale, t }: { series: PinSeriesData; locale: string; t: ReturnType<typeof useT> }) {
  const [hover, setHover] = useState<Hover>(null);
  const svg = useRef<SVGSVGElement>(null);

  const day = useMemo(
    () => new Intl.DateTimeFormat(INTL_LOCALES[locale as keyof typeof INTL_LOCALES] ?? 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }),
    [locale],
  );
  const num = useMemo(() => new Intl.NumberFormat(INTL_LOCALES[locale as keyof typeof INTL_LOCALES] ?? 'en-US'), [locale]);

  const { points, min, max } = useMemo(() => seriesExtent(series.points), [series.points]);
  if (points.length < 2) return null;

  // x by position rather than by date: a weekly series is evenly spaced, and
  // it keeps a gap in the record from stretching the curve.
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * PLOT.w;
  const y = (value: number) => PAD.top + PLOT.h - ((value - min) / (max - min || 1)) * PLOT.h;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${(PAD.top + PLOT.h).toFixed(1)} L${x(0).toFixed(1)} ${(PAD.top + PLOT.h).toFixed(1)} Z`;

  const markedIndex = series.marked ? points.findIndex((p) => p.day === series.marked) : -1;
  const latest = points.at(-1)!;
  const marked = markedIndex >= 0 ? points[markedIndex] : null;
  // What the event did to the series, when both ends are known.
  const change = marked && marked.value ? (latest.value - marked.value) / marked.value : null;

  const at = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const i = Math.round(ratio * (points.length - 1) * 1);
    const index = Math.min(points.length - 1, Math.max(0, i));
    setHover({ point: points[index], x: x(index), y: y(points[index].value) });
  };

  const unit = series.units ? sizeOf(series.units) : null;
  // The axis gets the bare number - the unit is named once, in the heading, so
  // the scale labels stay inside their gutter at phone width.
  const bare = (value: number) => num.format(unit ? Math.round((value / unit.divide) * 10) / 10 : value);
  const show = (value: number) => (unit ? `${bare(value)} ${unit.label}` : bare(value));

  return (
    <figure className="rounded-lg border border-line bg-panel px-3 py-3">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-xs font-bold tracking-wider text-subtle uppercase">{series.label ?? series.seriesId}</span>
        <span className="text-sm text-ink tabular-nums">
          {show(latest.value)}
          <span className="ml-2 text-xs text-subtle">{day.format(new Date(`${latest.day}T00:00:00Z`))}</span>
        </span>
      </figcaption>

      <svg
        ref={svg}
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={t('series.alt', {
          label: series.label ?? series.seriesId,
          from: points[0].day,
          to: latest.day,
          low: show(min),
          high: show(max),
        })}
        onPointerMove={at}
        onPointerLeave={() => setHover(null)}
      >
        {/* Recessive grid: three rules, no box, no vertical lines. */}
        {Array.from({ length: GRID_LINES }, (_, i) => {
          const value = min + ((max - min) * (i + 1)) / (GRID_LINES + 1);
          return (
            <line key={i} x1={PAD.left} x2={PAD.left + PLOT.w} y1={y(value)} y2={y(value)} className="stroke-line" strokeWidth="1" />
          );
        })}

        <path d={area} className="fill-accent/12" />
        <path d={line} className="stroke-accent" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />

        {/* The pin's own week: a rule to the axis and a marker on the curve. */}
        {marked ? (
          <g>
            <line
              x1={x(markedIndex)}
              x2={x(markedIndex)}
              y1={PAD.top}
              y2={PAD.top + PLOT.h}
              className="stroke-past"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <circle cx={x(markedIndex)} cy={y(marked.value)} r="5" className="fill-past stroke-panel" strokeWidth="2" />
          </g>
        ) : null}

        {/* Hover crosshair. */}
        {hover ? (
          <g>
            <line x1={hover.x} x2={hover.x} y1={PAD.top} y2={PAD.top + PLOT.h} className="stroke-subtle" strokeWidth="1" />
            <circle cx={hover.x} cy={hover.y} r="4.5" className="fill-accent stroke-panel" strokeWidth="2" />
          </g>
        ) : null}

        {/* The band's bounds, so magnitude is readable without hovering. The
            rest of the scale is the hover layer's job. */}
        <text x={PAD.left - 8} y={PAD.top + 4} textAnchor="end" className="fill-current text-[11px] text-faint tabular-nums">
          {bare(max)}
        </text>
        <text x={PAD.left - 8} y={PAD.top + PLOT.h} textAnchor="end" className="fill-current text-[11px] text-faint tabular-nums">
          {bare(min)}
        </text>
        <text x={PAD.left} y={VIEW.h - 6} className="fill-current text-[11px] text-faint">
          {points[0].day.slice(0, 4)}
        </text>
        <text x={PAD.left + PLOT.w} y={VIEW.h - 6} textAnchor="end" className="fill-current text-[11px] text-faint">
          {latest.day.slice(0, 4)}
        </text>
      </svg>

      <div className="mt-1 flex min-h-5 flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
        {hover ? (
          <span className="text-ink tabular-nums">
            {day.format(new Date(`${hover.point.day}T00:00:00Z`))} <span className="text-muted">{show(hover.point.value)}</span>
          </span>
        ) : marked ? (
          <span className="text-muted tabular-nums">
            <span className="mr-1 inline-block size-2 rounded-full bg-past align-middle" aria-hidden />
            {t('series.marked', { date: day.format(new Date(`${marked.day}T00:00:00Z`)), value: show(marked.value) })}
            {change != null ? (
              <span className={change < 0 ? 'ml-2 text-danger' : change > 0 ? 'ml-2 text-success' : 'ml-2 text-subtle'}>
                {change > 0 ? '+' : ''}
                {(change * 100).toFixed(1)}% {t('series.since')}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-subtle">
        <a href={series.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
          {t('series.source', { id: series.seriesId })}
        </a>
        {series.nextReleaseDate ? <span className="ml-2">{t('series.next', { date: series.nextReleaseDate })}</span> : null}
      </p>
    </figure>
  );
}
