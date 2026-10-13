'use client';

import Anchor from '@/components/ui/Anchor';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import Link from '@/components/ui/Link';
import { useT } from '@/lib/client/i18n';
import { loadModelChart, showPrice, type ModelChartData, type ModelPoint } from '@/lib/modelChart';

// Cost against quality for the AI models, on an AI model pin's side panel:
// every model with both an arena score and a price, the pin's own model drawn
// large with a ring so it can be read against the field at a glance. One tab
// per release year (the chart is a lot of dots; a year is a field you can
// read), opening on the newest year; the pinned model is drawn in every tab,
// the axes widening to take it, so "how does it fare against 2026's models"
// is one click. Hovering a dot names it and rings it; clicking it keeps it
// selected, and its name underneath is the link to the pin that announced that
// model, when the site has one. Nothing when the pin is not about a known model line or a
// source is down.
//
// One kind of mark, so no categorical palette: the field is a recessive dot,
// the frontier (nothing cheaper scores as high) is a stronger dot joined by a
// step line, and the pinned model wears the accent. Text stays in the ink
// tokens; both tokens are redefined per theme in globals.css.
//
// The x axis is a log scale: prices span three orders of magnitude. The
// arena's own page and OpenRouter are linked underneath, which is the
// accessible table view for this chart.
//
// The expand button at the card's top right opens the chart in a large
// overlay (Escape, the same button or a click outside closes it), for reading
// a crowded year's dots and names at size. Desktop only (lg, where the pin
// page is two columns and the chart sits in the narrow one): on a phone the
// card already runs the full width.

const VIEW = { w: 640, h: 380 };
const PAD = { top: 16, right: 16, bottom: 44, left: 48 };
const PLOT = { w: VIEW.w - PAD.left - PAD.right, h: VIEW.h - PAD.top - PAD.bottom };
const LABELLED_FRONTIER = 2;

// 1-2-5 gridlines inside [lo, hi] on a log axis.
function priceTicks(lo: number, hi: number): number[] {
  const out: number[] = [];
  const first = Math.floor(Math.log10(lo));
  const last = Math.ceil(Math.log10(hi));
  for (let e = first; e <= last; e++) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= lo && v <= hi) out.push(v);
    }
  }
  return out;
}

export function PinModelChart({ pinId, has, className = '' }: { pinId: number; has: boolean; className?: string }) {
  const [data, setData] = useState<ModelChartData | null>(null);
  useEffect(() => {
    if (!has) return;
    let cancelled = false;
    loadModelChart(pinId).then((d) => {
      if (!cancelled && d?.points.length) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [pinId, has]);

  if (!data) return null;
  return <Chart data={data} pinId={pinId} className={className} />;
}

function Chart({ data, pinId, className }: { data: ModelChartData; pinId: number; className: string }) {
  const t = useT();
  // Opens on the newest year, the field the model is read against today; the
  // dot on the pin's own year's tab says where it was released.
  const [year, setYear] = useState<number>(data.years[0]);
  const [hover, setHover] = useState<ModelPoint | null>(null);
  // The dot a click picked: it stays marked, and its name below is the link.
  const [selected, setSelected] = useState<ModelPoint | null>(null);
  const [expanded, setExpanded] = useState(false);
  // The same-thread names are off until asked for: the red dots already say
  // which models they are, and the names crowd the plot.
  const [threadNames, setThreadNames] = useState(false);
  const svg = useRef<SVGSVGElement>(null);

  // Expanded: Escape closes, and the page behind does not scroll.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [expanded]);

  const pinned = useMemo(() => data.points.find((p) => p.key === data.pinned) ?? null, [data]);
  const field = useMemo(() => data.points.filter((p) => p.year === year && p.key !== data.pinned), [data, year]);
  const shown = useMemo(() => (pinned ? [...field, pinned] : field), [field, pinned]);

  const frame = useMemo(() => {
    const prices = shown.map((p) => p.price);
    const elos = shown.map((p) => p.elo);
    // Pad the log axis by a sixth of a decade each side, the Elo axis by a twentieth.
    const lo = 10 ** (Math.log10(Math.min(...prices)) - 0.15);
    const hi = 10 ** (Math.log10(Math.max(...prices)) + 0.15);
    const eloLow = Math.min(...elos);
    const eloHigh = Math.max(...elos);
    const pad = Math.max(8, (eloHigh - eloLow) / 12);
    // Round Elo bounds on a step of 20 or 50, so the gridlines read as round numbers.
    const span = eloHigh - eloLow + 2 * pad;
    const step = span > 240 ? 50 : 20;
    return { lo, hi, eMin: Math.floor((eloLow - pad) / step) * step, eMax: Math.ceil((eloHigh + pad) / step) * step, step };
  }, [shown]);

  const x = (price: number) => PAD.left + ((Math.log10(price) - Math.log10(frame.lo)) / (Math.log10(frame.hi) - Math.log10(frame.lo) || 1)) * PLOT.w;
  const y = (elo: number) => PAD.top + PLOT.h - ((elo - frame.eMin) / (frame.eMax - frame.eMin || 1)) * PLOT.h;

  // The frontier is read within a year, so the pinned model is on it only in its own year's tab.
  const frontier = useMemo(
    () => shown.filter((p) => p.frontier && p.year === year).sort((a, b) => a.price - b.price),
    [shown, year],
  );
  // A step line through the frontier: the best score a given price buys.
  const step = frontier.map((p, i) => (i ? `H${x(p.price).toFixed(1)}V${y(p.elo).toFixed(1)}` : `M${x(p.price).toFixed(1)} ${y(p.elo).toFixed(1)}`)).join('');
  const labelled = useMemo(() => new Set([...frontier].sort((a, b) => b.elo - a.elo).slice(0, LABELLED_FRONTIER).map((p) => p.key)), [frontier]);
  const yTicks: number[] = [];
  for (let v = frame.eMin; v <= frame.eMax; v += frame.step) yTicks.push(v);

  const nearest = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    const px = ((event.clientX - box.left) / box.width) * VIEW.w;
    const py = ((event.clientY - box.top) / box.height) * VIEW.h;
    let best: ModelPoint | null = null;
    let bestD = 22 * 22;
    for (const p of shown) {
      const d = (x(p.price) - px) ** 2 + (y(p.elo) - py) ** 2;
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    setHover(best);
  };

  const label = hover ?? selected ?? pinned;
  // A model with its own pin goes there; the pin being read is already open.
  const linkOf = (p: ModelPoint | null) => (p?.href && p.pinId !== pinId ? p.href : null);
  const tabs = data.years;
  const hasThread = field.some((p) => p.thread);

  return (
    <div
      className={expanded ? 'fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-shade/60 p-2 sm:p-4' : undefined}
      onClick={expanded ? () => setExpanded(false) : undefined}
    >
      <section
        className={`text-sm ${expanded ? 'w-full max-w-[min(96vw,1800px)] rounded-xl bg-panel p-3 shadow-2xl sm:p-5' : className}`}
        aria-label={t('pin.modelChart.heading')}
        onClick={expanded ? (event) => event.stopPropagation() : undefined}
      >
      <h2 className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs font-semibold tracking-wide text-muted uppercase">
        <span>{t('pin.modelChart.heading')}</span>
        {data.publishedOn ? <span className="font-normal tracking-normal text-subtle normal-case">{t('pin.modelChart.asOf', { date: data.publishedOn })}</span> : null}
      </h2>
      <div className="surface rounded-lg px-3 py-3">
        <div className="mb-2 flex items-start justify-between gap-2">
        <div role="tablist" aria-label={t('pin.modelChart.years')} className="flex flex-wrap gap-1.5">
          {tabs.map((y) => (
            <button
              key={y}
              type="button"
              role="tab"
              aria-selected={y === year}
              onClick={() => {
                setYear(y);
                setHover(null);
                setSelected(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs leading-4 font-medium tabular-nums ring-1 ring-inset transition-colors ${
                y === year ? 'bg-accent/15 text-ink ring-accent' : 'bg-raised text-muted ring-line hover:bg-raised-2 hover:text-ink'
              }`}
            >
              {y}
              {pinned && pinned.year === y ? <span aria-hidden className="inline-block size-1.5 shrink-0 rounded-full bg-accent" /> : null}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {hasThread ? (
            <button
              type="button"
              aria-pressed={threadNames}
              aria-label={t('pin.modelChart.threadNames')}
              title={t('pin.modelChart.threadNames')}
              onClick={() => setThreadNames((v) => !v)}
              className={`inline-flex items-center rounded-full px-2.5 py-1.5 ring-1 ring-inset transition-colors ${
                threadNames ? 'bg-red-500/10 ring-red-500' : 'bg-raised ring-line hover:bg-raised-2'
              }`}
            >
              <span aria-hidden className="inline-block size-2.5 rounded-full bg-red-500" />
            </button>
          ) : null}
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? t('pin.modelChart.collapse') : t('pin.modelChart.expand')}
          title={expanded ? t('pin.modelChart.collapse') : t('pin.modelChart.expand')}
          onClick={() => setExpanded((v) => !v)}
          className="hidden items-center rounded-full lg:inline-flex bg-raised px-2.5 py-0.5 text-muted ring-1 ring-inset ring-line transition-colors hover:bg-raised-2 hover:text-ink"
        >
          <Icon name={expanded ? 'close' : 'expand'} className="size-4" />
        </button>
        </div>
        </div>

        <svg
          ref={svg}
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          className={`h-auto w-full touch-pan-y ${expanded ? 'max-h-[calc(100dvh-14rem)]' : ''}`}
          role="img"
          aria-label={t('pin.modelChart.alt', {
            year,
            count: shown.length,
            model: pinned ? `${pinned.name}: ${pinned.elo}, ${showPrice(pinned.price)}` : t('pin.modelChart.notPriced'),
          })}
          onPointerMove={nearest}
          onPointerDown={nearest}
          onPointerLeave={() => setHover(null)}
          onClick={() => setSelected(hover)}
          style={{ cursor: hover ? 'pointer' : undefined }}
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={PAD.left + PLOT.w} y1={y(v)} y2={y(v)} className="stroke-line" strokeWidth="1" />
              <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="fill-current text-[11px] text-faint tabular-nums">
                {Math.round(v)}
              </text>
            </g>
          ))}
          {priceTicks(frame.lo, frame.hi).map((v) => (
            <g key={v}>
              <line x1={x(v)} x2={x(v)} y1={PAD.top} y2={PAD.top + PLOT.h} className="stroke-line" strokeWidth="1" strokeDasharray="2 4" />
              <text x={x(v)} y={PAD.top + PLOT.h + 16} textAnchor="middle" className="fill-current text-[11px] text-faint tabular-nums">
                {showPrice(v)}
              </text>
            </g>
          ))}
          <text x={PAD.left + PLOT.w / 2} y={VIEW.h - 6} textAnchor="middle" className="fill-current text-[11px] text-subtle">
            {t('pin.modelChart.price')}
          </text>
          <text transform={`translate(12 ${PAD.top + PLOT.h / 2}) rotate(-90)`} textAnchor="middle" className="fill-current text-[11px] text-subtle">
            {t('pin.modelChart.elo')}
          </text>

          {step ? <path d={step} className="stroke-subtle" strokeWidth="1.5" fill="none" strokeLinejoin="round" /> : null}

          {field.map((p) => (
            <circle
              key={p.key}
              cx={x(p.price)}
              cy={y(p.elo)}
              r={p.thread ? 5.5 : p.frontier ? 4.5 : 3.5}
              className={
                p.thread
                  ? 'fill-red-500 stroke-panel'
                  : p.frontier ? 'fill-muted stroke-panel' : 'fill-subtle/60 stroke-panel'
              }
              strokeWidth="1"
            />
          ))}
          {field
            .filter((p) => (labelled.has(p.key) || (p.thread && threadNames)) && p.key !== hover?.key && p.key !== selected?.key)
            .map((p) => (
              <text key={p.key} x={x(p.price) + 7} y={y(p.elo) + 4} className={`fill-current text-[11px] ${p.thread ? 'font-medium text-red-600' : 'text-muted'}`}>
                {p.name}
              </text>
            ))}

          {/* The pinned model: a ring, a large dot and its name, so it is the
              first thing read, in every year's tab. */}
          {pinned ? (
            <g>
              <circle cx={x(pinned.price)} cy={y(pinned.elo)} r="15" className="fill-accent/20 stroke-accent" strokeWidth="1.5" />
              <circle cx={x(pinned.price)} cy={y(pinned.elo)} r="7" className="fill-accent stroke-panel" strokeWidth="2" />
              <text
                x={x(pinned.price)}
                y={y(pinned.elo) - 22}
                textAnchor={x(pinned.price) > PAD.left + PLOT.w * 0.65 ? 'end' : x(pinned.price) < PAD.left + PLOT.w * 0.2 ? 'start' : 'middle'}
                className="fill-current text-[12px] font-bold text-ink"
              >
                {pinned.name}
              </text>
            </g>
          ) : null}

          {[selected, hover && hover.key !== selected?.key ? hover : null].map((p) =>
            p ? (
              <g key={p.key}>
                <circle cx={x(p.price)} cy={y(p.elo)} r={p.key === data.pinned ? 19 : 9} className="fill-ink/10 stroke-ink" strokeWidth="2" />
                <text
                  x={x(p.price)}
                  y={y(p.elo) - (p.key === data.pinned ? 26 : 14)}
                  textAnchor={x(p.price) > PAD.left + PLOT.w * 0.65 ? 'end' : x(p.price) < PAD.left + PLOT.w * 0.2 ? 'start' : 'middle'}
                  className="fill-current text-[12px] font-bold text-ink"
                  paintOrder="stroke"
                  strokeWidth="3"
                  stroke="var(--color-panel, transparent)"
                >
                  {p.name}
                </text>
              </g>
            ) : null,
          )}
        </svg>

        <div className="mt-1 flex min-h-5 flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
          {label ? (
            <span className="text-ink tabular-nums">
              <span className={`me-1.5 inline-block size-2 rounded-full align-middle ${label.key === data.pinned ? 'bg-accent' : label.thread ? 'bg-red-500' : 'bg-subtle'}`} aria-hidden />
              {linkOf(label) ? (
                <Link href={linkOf(label)!} className="font-medium text-link hover:underline">
                  {label.name}
                </Link>
              ) : (
                label.name
              )}{' '}
              <span className="text-muted">{label.elo} Elo · {showPrice(label.price)}/M · {label.year}</span>
            </span>
          ) : (
            <span className="text-subtle">{t('pin.modelChart.notPriced')}</span>
          )}
        </div>

        <p className="mt-2 text-xs text-subtle">
          {t('pin.modelChart.note')}{' '}
          <Anchor href="https://arena.ai/leaderboard" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
            {t('pin.modelChart.sourceElo')}
          </Anchor>
          {' · '}
          <Anchor href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
            {t('pin.modelChart.sourcePrice')}
          </Anchor>
        </p>
      </div>
      </section>
    </div>
  );
}
