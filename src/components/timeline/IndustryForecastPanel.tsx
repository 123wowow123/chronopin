'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RefineLink } from '@/components/pin/RefineLink';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { formatForecastValue, type ForecastLine, type IndustryForecastJson } from '@/lib/industryForecast';

// Drawn narrow because the search side panel is: the text stays readable when
// it is scaled down to about 190px.
const dims = (large: boolean) => {
  const VIEW = large ? { w: 720, h: 380 } : { w: 300, h: 190 };
  const PAD = large ? { top: 14, right: 16, bottom: 26, left: 52 } : { top: 10, right: 10, bottom: 22, left: 40 };
  return { VIEW, PAD, PLOT: { w: VIEW.w - PAD.left - PAD.right, h: VIEW.h - PAD.top - PAD.bottom } };
};
// One colour per line, in the order they are listed; a survey is dashed (as
// Ramp dashes its Census line) and a projection dashed longer.
const STROKES = ['stroke-accent', 'stroke-success', 'stroke-muted', 'stroke-danger'];
const FILLS = ['fill-accent', 'fill-success', 'fill-muted', 'fill-danger'];
const DOTS = ['bg-accent', 'bg-success', 'bg-muted', 'bg-danger'];
const TICKS = 3;
const PROJECTED_SHOWN = 3;

// A year ("2027") sits mid-year; a day is itself.
const at = (x: string) => (/^\d{4}$/.test(x) ? Date.UTC(Number(x), 6, 1) : Date.parse(`${x}T00:00:00Z`));
const dayLabel = (x: string) => (/^\d{4}$/.test(x) ? x : /-01$/.test(x) ? x.slice(0, 7) : x);

type Drawn = { line: ForecastLine; kind: 'live' | 'snapshot' | 'projection' | 'earlier' };

// Earlier editions are grey and dotted and take no colour from the palette.
const toneOf = (lines: Drawn[], index: number) => {
  if (lines[index].kind === 'earlier') return { stroke: 'stroke-subtle', fill: 'fill-subtle', dot: 'bg-subtle' };
  const c = lines.slice(0, index).filter((l) => l.kind !== 'earlier').length % STROKES.length;
  return { stroke: STROKES[c], fill: FILLS[c], dot: DOTS[c] };
};

function Chart({ forecast, large = false }: { forecast: IndustryForecastJson; large?: boolean }) {
  const { VIEW, PAD, PLOT } = dims(large);
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  // Earlier editions first, so the current lines draw over them.
  const lines: Drawn[] = [
    ...forecast.earlier.map((line) => ({ line, kind: 'earlier' as const })),
    ...forecast.lines.map((line) => ({ line, kind: line.kind === 'snapshot' ? ('snapshot' as const) : ('live' as const) })),
    ...(forecast.projection ? [{ line: forecast.projection, kind: 'projection' as const }] : []),
  ];
  const geo = useMemo(() => {
    const pts = lines.flatMap(({ line }) => line.points.map((p) => ({ t: at(p.x), v: p.value })));
    if (pts.length < 2) return null;
    const t0 = Math.min(...pts.map((p) => p.t));
    const t1 = Math.max(...pts.map((p) => p.t));
    const lo = Math.min(0, ...pts.map((p) => p.v));
    const hi = Math.max(...pts.map((p) => p.v)) * 1.05;
    // The axis labels set the left margin: four-digit values need more room.
    const tickLabel = (v: number) => formatForecastValue(forecast, hi - lo >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
    const ticks = Array.from({ length: TICKS + 1 }, (_, k) => lo + ((hi - lo) * k) / TICKS);
    const padLeft = Math.max(PAD.left, Math.max(...ticks.map((v) => tickLabel(v).length)) * (large ? 8 : 7) + 12);
    const plotW = VIEW.w - padLeft - PAD.right;
    const x = (t: number) => padLeft + ((t - t0) / (t1 - t0 || 1)) * plotW;
    const y = (v: number) => PAD.top + PLOT.h - ((v - lo) / (hi - lo || 1)) * PLOT.h;
    // Every time any line has a point: the hover snaps to one of them.
    const times = [...new Set(pts.map((p) => p.t))].sort((a, b) => a - b);
    return { t0, t1, lo, hi, x, y, times, ticks, tickLabel, padLeft, plotW };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecast, large]);
  if (!geo) return null;
  const { x, y, t0, t1, times, ticks, tickLabel, padLeft, plotW } = geo;

  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    const px = ((event.clientX - box.left) / box.width) * VIEW.w;
    const t = t0 + ((px - padLeft) / plotW) * (t1 - t0);
    setHover(times.reduce((best, c) => (Math.abs(c - t) < Math.abs(best - t) ? c : best), times[0]));
  };
  // The point of each line at the hovered time (a line with none there is left out).
  const hit = hover == null ? [] : lines.map(({ line }, i) => ({ i, line, p: line.points.find((p) => at(p.x) === hover) })).filter((h) => h.p);
  const left = hover == null ? 0 : ((x(hover) / VIEW.w) * 100);
  const yearOf = (t: number) => new Date(t).getUTCFullYear();

  return (
    <div className="relative">
      <svg
        ref={svg}
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={`${forecast.title}: ${forecast.industry}`}
        onPointerMove={move}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((v, k) => (
          <g key={k}>
            <line x1={padLeft} x2={padLeft + plotW} y1={y(v)} y2={y(v)} className="stroke-line" strokeWidth="1" />
            <text x={padLeft - 8} y={y(v) + 4} textAnchor="end" className="fill-current text-[13px] text-faint tabular-nums">{tickLabel(v)}</text>
          </g>
        ))}
        {lines.map(({ line, kind }, i) => {
          const d = line.points.map((p, j) => `${j ? 'L' : 'M'}${x(at(p.x)).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
          return (
            <g key={line.label}>
              <path d={d} className={toneOf(lines, i).stroke} fill="none" strokeWidth={kind === 'earlier' ? 1.5 : 2} strokeDasharray={kind === 'earlier' ? '1 4' : kind === 'projection' ? '7 4' : kind === 'snapshot' ? '3 3' : undefined} strokeLinejoin="round" strokeLinecap="round" />
              {kind === 'projection' || kind === 'earlier' || line.points.length < 6 ? line.points.map((p) => <circle key={p.x} cx={x(at(p.x))} cy={y(p.value)} r={kind === 'earlier' ? 2.5 : 3.5} className={toneOf(lines, i).fill} />) : null}
            </g>
          );
        })}
        {hover != null ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + PLOT.h} className="stroke-subtle" strokeWidth="1" />
            {hit.map(({ i, p }) => <circle key={i} cx={x(hover)} cy={y(p!.value)} r="4.5" className={`${toneOf(lines, i).fill} stroke-panel`} strokeWidth="2" />)}
          </g>
        ) : null}
        <text x={padLeft} y={VIEW.h - 6} className="fill-current text-[13px] text-faint">{yearOf(t0)}</text>
        <text x={padLeft + plotW} y={VIEW.h - 6} textAnchor="end" className="fill-current text-[13px] text-faint">{yearOf(t1)}</text>
      </svg>
      {hover != null && hit.length ? (
        <div
          className={`pointer-events-none absolute top-1 z-10 w-max max-w-[80%] rounded-md border border-line bg-panel px-2 py-1.5 text-xs shadow-md ${left > 50 ? 'start-1' : 'end-1'}`}
        >
          <div className="mb-0.5 font-semibold text-ink tabular-nums">{dayLabel(hit[0].p!.x)}</div>
          {hit.map(({ i, line, p }) => (
            <div key={i} className="flex items-center gap-1.5 text-muted tabular-nums">
              <span className={`size-2 shrink-0 rounded-full ${toneOf(lines, i).dot}`} aria-hidden />
              <span className="truncate">{line.label}</span>
              <span className="ms-auto ps-2 font-semibold text-ink">{formatForecastValue(forecast, p!.value)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Body({ forecast, large = false }: { forecast: IndustryForecastJson; large?: boolean }) {
  const t = useT();
  const latest = forecast.lines.map((l) => ({ label: l.label, p: l.points.at(-1) })).filter((l): l is { label: string; p: { x: string; value: number } } => !!l.p);
  const projected = forecast.projection?.points ?? [];
  // A long projection starts collapsed to its first few years.
  const [expanded, setExpanded] = useState(large);
  const shown = expanded ? projected : projected.slice(0, PROJECTED_SHOWN);
  return (
    <>
      <Chart forecast={forecast} large={large} />
      <ul className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 tabular-nums text-muted ${large ? 'text-sm' : 'text-xs'}`}>
        {latest.map(({ label, p }, i) => (
          <li key={label}>
            <span className={`me-1 inline-block size-2 rounded-full ${DOTS[i % DOTS.length]}`} aria-hidden />
            {label}: <span className="font-semibold text-ink">{formatForecastValue(forecast, p.value)}</span> <span className="text-subtle">({p.x.slice(0, 7)} · {t('pin.industry.reported')})</span>
          </li>
        ))}
        {shown.map((p) => (
          <li key={p.x}>
            {forecast.projection!.label} {p.x}: <span className="font-semibold text-ink">{formatForecastValue(forecast, p.value)}</span> <span className="text-subtle">({t('pin.industry.projected')})</span>
          </li>
        ))}
        {projected.length > PROJECTED_SHOWN ? (
          <li className="w-full">
            <button type="button" onClick={() => setExpanded(!expanded)} className="text-accent hover:underline">
              {expanded ? t('common.showLess') : `${t('common.showMore')} (${projected.length - PROJECTED_SHOWN})`}
            </button>
          </li>
        ) : null}
        {forecast.earlier.map((e) => (
          <li key={e.label} className="w-full text-subtle">
            <span className="me-1 inline-block w-4 border-t-2 border-dotted border-subtle align-middle" aria-hidden />
            {t('pin.industry.revised')}: {e.label} ({e.points.map((p) => `${p.x} ${formatForecastValue(forecast, p.value)}`).join(', ')})
          </li>
        ))}
      </ul>
      {forecast.note ? <p className={`mt-2 text-muted ${large ? 'text-sm' : 'text-xs'}`}>{forecast.note}</p> : null}
      <details className="mt-2 text-xs" open={large}>
        <summary className="cursor-pointer font-medium text-muted">{t('pin.industry.sources')}</summary>
        <ul className="mt-1 space-y-1.5">
          {forecast.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{s.label}</a>
              {s.date ? <span className="text-subtle"> · {s.date}</span> : null}
              {s.quote ? <blockquote className="mt-0.5 border-s-2 border-line ps-2 text-muted italic">“{s.quote}”</blockquote> : null}
            </li>
          ))}
        </ul>
        {forecast.projection ? <p className="mt-1.5 text-subtle">{t('pin.industry.caveat')}</p> : null}
        <p className="mt-1 text-subtle">{t('pin.industry.checked', { date: forecast.checkedAt.slice(0, 10) })}</p>
      </details>
    </>
  );
}

export function ForecastCard({ forecast }: { forecast: IndustryForecastJson }) {
  const t = useT();
  const modal = useRef<HTMLDialogElement>(null);
  const caption = (
    <>
      <span className="text-xs font-bold tracking-wider text-subtle uppercase">{t('pin.industry.heading')} ·{' '}
        <RefineLink field="tag" value={forecast.industry} className="hover:text-ink hover:underline">
          {forecast.industry}
        </RefineLink>
      </span>
      <span className="mt-0.5 block font-semibold text-ink">{forecast.title}</span>
    </>
  );
  return (
    <figure className="rounded-lg border border-line bg-panel px-3 py-3 text-sm">
      <figcaption className="mb-2 flex items-start gap-2">
        <span className="min-w-0 flex-1">{caption}</span>
        <button
          type="button"
          onClick={() => modal.current?.showModal()}
          aria-label={t('pin.modelChart.expand')}
          title={t('pin.modelChart.expand')}
          className="-me-1 shrink-0 rounded p-1 text-subtle hover:bg-raised hover:text-ink"
        >
          <Icon name="expand" className="size-4" />
        </button>
      </figcaption>
      <Body forecast={forecast} />
      {/* The same panel at full size; a click on the backdrop or Esc closes it. */}
      <dialog
        ref={modal}
        onClick={(e) => e.target === modal.current && modal.current.close()}
        className="m-auto w-[min(760px,94vw)] max-h-[92vh] overflow-y-auto rounded-xl border border-line bg-panel p-5 text-ink backdrop:bg-black/60"
      >
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">{caption}</div>
          <button type="button" onClick={() => modal.current?.close()} aria-label={t('common.close')} className="shrink-0 rounded p-1 text-subtle hover:bg-raised hover:text-ink">
            <Icon name="close" className="size-5" />
          </button>
        </div>
        <Body forecast={forecast} large />
      </dialog>
    </figure>
  );
}

// Industry forecast panels for an industry's pins and searches
// (IndustryForecast, 0216): published series (Ramp AI Index via FRED, Census
// BTOS) with sourced projections (Goldman Sachs, Gartner) dashed beyond them.
// `slugs` come from the page's tags, so nothing renders when none match.
export function IndustryForecastPanel({ slugs, compact = false, limit }: { slugs: string[]; compact?: boolean; limit?: number }) {
  const t = useT();
  const [forecasts, setForecasts] = useState<IndustryForecastJson[]>([]);
  const [all, setAll] = useState(false);
  const key = slugs.join(',');
  useEffect(() => {
    let cancelled = false;
    api
      .get<IndustryForecastJson[]>(`/api/industry-forecasts?slugs=${encodeURIComponent(key)}`)
      .then((f) => !cancelled && setForecasts(f))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);
  if (!forecasts.length) return null;
  return (
    <div className={compact ? 'flex flex-col gap-3' : 'my-4 flex flex-col gap-3'} data-industry-forecast>
      {(limit && !all ? forecasts.slice(0, limit) : forecasts).map((f) => <ForecastCard key={f.slug} forecast={f} />)}
      {limit && forecasts.length > limit ? (
        <button type="button" onClick={() => setAll(!all)} className="self-start rounded-full px-3 py-1 text-xs text-muted ring-1 ring-line ring-inset hover:text-ink">
          {all ? t('common.showLess') : `${t('common.showMore')} (${forecasts.length - limit})`}
        </button>
      ) : null}
    </div>
  );
}
