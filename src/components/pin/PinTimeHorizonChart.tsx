"use client";

import { addEscape, removeEscape } from "@/lib/client/escapeStack";
import Anchor from "@/components/ui/Anchor";
import { Icon } from "@/components/ui/Icon";
import Link from "@/components/ui/Link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/client/i18n";
import {
  formatHorizon,
  loadHorizonChart,
  type HorizonChartData,
  type HorizonPoint,
  type HorizonValue,
} from "@/lib/timeHorizon";

// METR's time horizons on an AI model pin's side panel: how long a software
// task (measured in human minutes) a model completes 50% or 80% of the time,
// against release date. Every measured model a dot with its confidence
// interval, the models that set a new best filled dark, a dashed exponential
// trend through them, the pin's own model large with a ring. Log or linear
// scale. Nothing when the pin names no model METR has measured or the source is down.

const VIEW = { w: 640, h: 340 };
const PAD = { top: 16, right: 16, bottom: 36, left: 56 };
const PLOT = {
  w: VIEW.w - PAD.left - PAD.right,
  h: VIEW.h - PAD.top - PAD.bottom,
};
const DAY = 86_400_000;
const YEAR = 365.25 * DAY;
const time = (day: string) => Date.parse(`${day}T00:00:00Z`);
// Gridline candidates, in minutes.
// The year the narrowed view starts in.
const SINCE = 2025;
const TICKS = [1 / 60, 1 / 6, 1, 10, 60, 600, 6000];

type Which = "p50" | "p80";
type Pt = { p: HorizonPoint; v: HorizonValue; frontier: boolean };

export function PinTimeHorizonChart({
  pinId,
  has,
  className = "",
}: {
  pinId: number;
  has: boolean;
  className?: string;
}) {
  const [data, setData] = useState<HorizonChartData | null>(null);
  useEffect(() => {
    if (!has) return;
    let cancelled = false;
    loadHorizonChart(pinId).then((d) => {
      if (!cancelled && d?.points.length) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [pinId, has]);
  return data ? <Chart data={data} pinId={pinId} className={className} /> : null;
}

function Chart({
  data,
  pinId,
  className,
}: {
  data: HorizonChartData;
  pinId: number;
  className: string;
}) {
  const t = useT();
  const clip = `th-clip-${pinId}`;
  const svg = useRef<SVGSVGElement>(null);
  const [which, setWhich] = useState<Which>("p80");
  const [log, setLog] = useState(true);
  // Narrowed by default; a pin whose model predates SINCE has no narrowed view.
  const [recent, setRecent] = useState(true);
  const [hover, setHover] = useState<Pt | null>(null);
  const [selected, setSelected] = useState<Pt | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    addEscape(onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      removeEscape(onKey);
      document.body.style.overflow = overflow;
    };
  }, [expanded]);

  // The points with this reading, each marked when it beat every earlier one.
  const all: Pt[] = useMemo(() => {
    const rows = data.points.filter((p) => p[which]).map((p) => ({ p, v: p[which]! }));
    return rows.map(({ p, v }, i) => ({
      p,
      v,
      frontier: rows.slice(0, i).every((r) => r.v.minutes < v.minutes),
    }));
  }, [data, which]);
  const cut = `${SINCE}-01-01`;
  const canNarrow = all.some((q) => q.p.key === data.pinned && q.p.date >= cut);
  const narrow = recent && canNarrow;
  const pts = useMemo(() => (narrow ? all.filter((q) => q.p.date >= cut) : all), [all, narrow, cut]);
  const pinned = pts.find((q) => q.p.key === data.pinned) ?? null;

  const frame = useMemo(() => {
    const times = pts.map((q) => time(q.p.date));
    const values = pts.flatMap((q) => [q.v.minutes, q.v.low ?? q.v.minutes, q.v.high ?? q.v.minutes]);
    const t0 = Math.min(...times) - 60 * DAY;
    const t1 = Math.max(...times) + 60 * DAY;
    const max = Math.max(...values);
    const min = Math.min(...values);
    return {
      t0,
      t1,
      lo: Math.log10(min) - 0.15,
      hi: Math.log10(max) + 0.15,
      top: max * 1.1,
    };
  }, [pts]);
  const x = (day: string) =>
    PAD.left + ((time(day) - frame.t0) / (frame.t1 - frame.t0 || 1)) * PLOT.w;
  const y = (m: number) =>
    PAD.top +
    PLOT.h -
    (log
      ? ((Math.log10(Math.max(m, 1e-6)) - frame.lo) / (frame.hi - frame.lo || 1)) * PLOT.h
      : (m / frame.top) * PLOT.h);

  // Exponential trend through the frontier models: least squares of log(minutes) on time.
  const trend = useMemo(() => {
    const f = all.filter((q) => q.frontier);
    if (f.length < 3) return null;
    const xs = f.map((q) => (time(q.p.date) - frame.t0) / YEAR);
    const ys = f.map((q) => Math.log10(q.v.minutes));
    const n = f.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    const den = xs.reduce((a, b) => a + (b - mx) ** 2, 0);
    if (!den) return null;
    const slope = xs.reduce((a, b, i) => a + (b - mx) * (ys[i] - my), 0) / den;
    return { slope, at: (ms: number) => 10 ** (my + slope * ((ms - frame.t0) / YEAR - mx)) };
  }, [all, frame.t0]);
  const trendD = useMemo(() => {
    if (!trend) return "";
    const steps = 48;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const ms = frame.t0 + ((frame.t1 - frame.t0) * i) / steps;
      const yy = Math.min(Math.max(y(trend.at(ms)), -1e4), 1e4);
      d += `${d ? "L" : "M"}${(PAD.left + (PLOT.w * i) / steps).toFixed(1)} ${yy.toFixed(1)}`;
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trend, log, frame]);

  const yTicks = log
    ? TICKS.filter((m) => Math.log10(m) >= frame.lo && Math.log10(m) <= frame.hi)
    : [0, 1, 2, 4, 6, 8, 10, 12, 16, 20]
        .map((h) => h * 60)
        .filter((m) => m <= frame.top);
  const firstYear = new Date(frame.t0).getUTCFullYear() + 1;
  const years: number[] = [];
  for (let yr = firstYear; time(`${yr}-01-01`) < frame.t1; yr++) years.push(yr);

  const pick = (clientX: number, clientY: number): Pt | null => {
    const el = svg.current;
    const ctm = el?.getScreenCTM();
    if (!el || !ctm) return null;
    const at = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    let best: Pt | null = null;
    let bestD = 20 * 20;
    for (const q of pts) {
      const d = (x(q.p.date) - at.x) ** 2 + (y(q.v.minutes) - at.y) ** 2;
      if (d < bestD) {
        best = q;
        bestD = d;
      }
    }
    return best;
  };
  const nearest = (event: React.PointerEvent<SVGSVGElement>) =>
    setHover(pick(event.clientX, event.clientY));
  const label = hover ?? selected ?? pinned;
  const linkOf = (q: Pt | null) =>
    q?.p.href && q.p.pinId !== pinId ? q.p.href : null;
  const anchorOf = (day: string) =>
    x(day) > PAD.left + PLOT.w * 0.65
      ? "end"
      : x(day) < PAD.left + PLOT.w * 0.2
        ? "start"
        : "middle";
  const pill = (on: boolean) =>
    `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset transition-colors ${
      on
        ? "bg-accent/10 text-ink ring-accent"
        : "bg-raised text-muted ring-line hover:bg-raised-2"
    }`;
  const heading = t("pin.timeHorizon.heading", {
    percent: which === "p80" ? "80" : "50",
  });

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-shade/60 p-2 sm:p-4"
          : undefined
      }
      onClick={expanded ? () => setExpanded(false) : undefined}
    >
      <section
        className={`text-sm ${expanded ? "w-full max-w-[min(96vw,1800px)] rounded-xl bg-panel p-3 shadow-2xl sm:p-5" : className}`}
        aria-label={heading}
        onClick={expanded ? (event) => event.stopPropagation() : undefined}
      >
        <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
          {heading}
        </h2>
        <div className="surface rounded-lg px-3 py-3">
          <div className="mb-2 flex flex-wrap items-center justify-end gap-1.5">
            {canNarrow ? (
              <button type="button" aria-pressed={narrow} onClick={() => setRecent(!recent)} className={`${pill(narrow)} tabular-nums`}>
                {SINCE}+
              </button>
            ) : null}
            <button type="button" aria-pressed={log} onClick={() => setLog(true)} className={pill(log)}>
              {t("pin.timeHorizon.log")}
            </button>
            <button type="button" aria-pressed={!log} onClick={() => setLog(false)} className={pill(!log)}>
              {t("pin.timeHorizon.linear")}
            </button>
            <button type="button" aria-pressed={which === "p50"} onClick={() => setWhich("p50")} className={`${pill(which === "p50")} tabular-nums`}>
              50%
            </button>
            <button type="button" aria-pressed={which === "p80"} onClick={() => setWhich("p80")} className={`${pill(which === "p80")} tabular-nums`}>
              80%
            </button>
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? t("pin.modelChart.collapse") : t("pin.modelChart.expand")}
              title={expanded ? t("pin.modelChart.collapse") : t("pin.modelChart.expand")}
              onClick={() => setExpanded((v) => !v)}
              className="hidden items-center rounded-full bg-raised px-2.5 py-0.5 text-muted ring-1 ring-inset ring-line transition-colors hover:bg-raised-2 hover:text-ink lg:inline-flex"
            >
              <Icon name={expanded ? "close" : "expand"} className="size-4" />
            </button>
          </div>

          <svg
            ref={svg}
            viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
            className={`h-auto w-full touch-pan-y ${expanded ? "max-h-[calc(100dvh-12rem)]" : ""}`}
            role="img"
            aria-label={t("pin.timeHorizon.alt", {
              count: pts.length,
              model: pinned ? `${pinned.p.name}: ${formatHorizon(pinned.v.minutes)}` : "",
            })}
            onPointerMove={nearest}
            onPointerDown={nearest}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") setHover(null);
            }}
            onClick={(event) => setSelected(pick(event.clientX, event.clientY))}
            style={{ cursor: hover ? "pointer" : undefined }}
          >
            {yTicks.map((m) => (
              <g key={m}>
                <line x1={PAD.left} x2={PAD.left + PLOT.w} y1={y(m)} y2={y(m)} className="stroke-line" strokeWidth="1" />
                <text x={PAD.left - 8} y={y(m) + 4} textAnchor="end" className="fill-current text-[11px] text-faint tabular-nums">
                  {m === 0 ? "0" : formatHorizon(m)}
                </text>
              </g>
            ))}
            {years.map((yr) => (
              <g key={yr}>
                <line x1={x(`${yr}-01-01`)} x2={x(`${yr}-01-01`)} y1={PAD.top} y2={PAD.top + PLOT.h} className="stroke-line" strokeWidth="1" strokeDasharray="2 4" />
                <text x={x(`${yr}-01-01`)} y={PAD.top + PLOT.h + 16} textAnchor="middle" className="fill-current text-[11px] text-faint tabular-nums">
                  {yr}
                </text>
              </g>
            ))}
            <text
              transform={`translate(11 ${PAD.top + PLOT.h / 2}) rotate(-90)`}
              textAnchor="middle"
              className="fill-current text-[11px] text-subtle"
            >
              {t("pin.timeHorizon.axis")}
            </text>

            <clipPath id={clip}>
              <rect x={PAD.left} y={PAD.top} width={PLOT.w} height={PLOT.h} />
            </clipPath>
            {trendD ? (
              <path d={trendD} clipPath={`url(#${clip})`} className="stroke-subtle" strokeWidth="1.5" strokeDasharray="5 4" fill="none" />
            ) : null}

            {pts.map((q) =>
              q.v.low != null && q.v.high != null ? (
                <line key={`ci-${q.p.key}`} x1={x(q.p.date)} x2={x(q.p.date)} y1={y(q.v.low)} y2={y(q.v.high)} className="stroke-line" strokeWidth="1.5" />
              ) : null,
            )}
            {pts
              .filter((q) => q.p.key !== data.pinned)
              .map((q) => (
                <circle
                  key={q.p.key}
                  cx={x(q.p.date)}
                  cy={y(q.v.minutes)}
                  r={q.frontier ? 4.5 : 3.5}
                  className={q.frontier ? "fill-muted stroke-panel" : "fill-subtle/50 stroke-panel"}
                  strokeWidth="1"
                />
              ))}
            {pts
              .filter((q) => q.frontier && q.p.key !== data.pinned && q.p.key !== hover?.p.key && q.p.key !== selected?.p.key)
              .map((q) => (
                <text
                  key={`n-${q.p.key}`}
                  x={x(q.p.date) - 7}
                  y={y(q.v.minutes) + 4}
                  textAnchor="end"
                  className="fill-current text-[10px] text-subtle"
                  paintOrder="stroke"
                  strokeWidth="3"
                  stroke="var(--color-panel, transparent)"
                >
                  {q.p.name}
                </text>
              ))}

            {pinned ? (
              <g>
                <circle cx={x(pinned.p.date)} cy={y(pinned.v.minutes)} r="15" className="fill-accent/20 stroke-accent" strokeWidth="1.5" />
                <circle cx={x(pinned.p.date)} cy={y(pinned.v.minutes)} r="7" className="fill-accent stroke-panel" strokeWidth="2" />
                <text
                  x={x(pinned.p.date)}
                  y={y(pinned.v.minutes) - 22}
                  textAnchor={anchorOf(pinned.p.date)}
                  className="fill-current text-[12px] font-bold text-ink"
                  paintOrder="stroke"
                  strokeWidth="3"
                  stroke="var(--color-panel, transparent)"
                >
                  {pinned.p.name}
                </text>
              </g>
            ) : null}

            {[selected, hover && hover.p.key !== selected?.p.key ? hover : null].map((q) =>
              q && q.p.key !== data.pinned ? (
                <g key={q.p.key}>
                  <circle cx={x(q.p.date)} cy={y(q.v.minutes)} r="9" className="fill-ink/10 stroke-ink" strokeWidth="2" />
                  <text
                    x={x(q.p.date)}
                    y={y(q.v.minutes) - 14}
                    textAnchor={anchorOf(q.p.date)}
                    className="fill-current text-[12px] font-bold text-ink"
                    paintOrder="stroke"
                    strokeWidth="3"
                    stroke="var(--color-panel, transparent)"
                  >
                    {q.p.name}
                  </text>
                </g>
              ) : null,
            )}
          </svg>

          <div className="mt-1 min-h-5 text-xs">
            {label ? (
              <span className="text-ink tabular-nums">
                <span
                  className={`me-1.5 inline-block size-2 rounded-full align-middle ${label.p.key === data.pinned ? "bg-accent" : "bg-subtle"}`}
                  aria-hidden
                />
                {linkOf(label) ? (
                  <Link href={linkOf(label)!} className="font-medium text-link hover:underline">
                    {label.p.name}
                  </Link>
                ) : (
                  <span className="font-medium">{label.p.name}</span>
                )}{" "}
                <span className="text-muted">
                  {formatHorizon(label.v.minutes)}
                  {label.v.low != null && label.v.high != null
                    ? ` (${formatHorizon(label.v.low)}–${formatHorizon(label.v.high)})`
                    : ""}{" "}
                  · {label.p.date}
                </span>
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-subtle">
            {t("pin.timeHorizon.note", { percent: which === "p80" ? "80" : "50" })}{" "}
            <Anchor
              href="https://metr.org/time-horizons/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:underline"
            >
              {t("pin.timeHorizon.source")}
            </Anchor>
          </p>
        </div>
      </section>
    </div>
  );
}
