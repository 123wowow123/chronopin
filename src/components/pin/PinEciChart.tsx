"use client";

import { addEscape, removeEscape } from "@/lib/client/escapeStack";
import Anchor from "@/components/ui/Anchor";
import { Icon } from "@/components/ui/Icon";
import Link from "@/components/ui/Link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/client/i18n";
import { loadEciChart, type EciChartData, type EciPoint } from "@/lib/eciChart";

// Epoch AI's Capabilities Index against release date, on an AI model pin's side
// panel: every scored model a dot, the running best (the frontier) a step line,
// the pin's own model large with a ring and its confidence interval. Open-weights
// models are hollow. Hover or tap names a dot. Nothing when the pin names no
// model Epoch has scored or the source is down.

const VIEW = { w: 640, h: 340 };
const PAD = { top: 16, right: 16, bottom: 36, left: 44 };
const PLOT = {
  w: VIEW.w - PAD.left - PAD.right,
  h: VIEW.h - PAD.top - PAD.bottom,
};
const DAY = 86_400_000;
const time = (day: string) => Date.parse(`${day}T00:00:00Z`);

export function PinEciChart({
  pinId,
  has,
  since,
  className = "",
}: {
  pinId: number;
  has: boolean;
  // Year the toggle can narrow the chart to: only models released then or later,
  // the frontier line entering at the best score reached before it.
  since?: number;
  className?: string;
}) {
  // Narrowed by default; a pin whose model predates `since` has no narrowed view and shows everything.
  const [recent, setRecent] = useState(true);
  const [data, setData] = useState<EciChartData | null>(null);
  useEffect(() => {
    if (!has) return;
    let cancelled = false;
    loadEciChart(pinId).then((d) => {
      if (!cancelled && d?.points.length) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [pinId, has]);
  const narrowed = useMemo(
    () => (data && since ? windowed(data, since) : null),
    [data, since],
  );
  const shown = recent && narrowed ? narrowed : data;
  return shown ? (
    <Chart
      data={shown}
      since={recent && narrowed ? since : undefined}
      toggle={
        narrowed && since
          ? { year: since, on: recent, set: setRecent }
          : undefined
      }
      pinId={pinId}
      className={className}
    />
  ) : null;
}

// The chart from `year` on. Null when the pin's own model is older. `baseline`
// is the best score before the cut, where the step line begins.
function windowed(data: EciChartData, year: number): EciChartData | null {
  const cut = `${year}-01-01`;
  const points = data.points.filter((p) => p.date >= cut);
  if (!points.some((p) => p.key === data.pinned)) return null;
  const before = data.points.filter((p) => p.date < cut && p.frontier);
  const baseline = before.length ? Math.max(...before.map((p) => p.eci)) : undefined;
  return { ...data, points, baseline };
}

function Chart({
  data,
  since,
  toggle,
  pinId,
  className,
}: {
  data: EciChartData;
  since?: number;
  toggle?: { year: number; on: boolean; set: (on: boolean) => void };
  pinId: number;
  className: string;
}) {
  const t = useT();
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<EciPoint | null>(null);
  const [selected, setSelected] = useState<EciPoint | null>(null);
  // Same-thread names are off until asked for: the red dots already say which models they are.
  const [threadNames, setThreadNames] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Expanded: Escape closes, and the page behind does not scroll.
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
  const pinned = data.points.find((p) => p.key === data.pinned) ?? null;

  const frame = useMemo(() => {
    const times = data.points.map((p) => time(p.date));
    const scores = data.points.flatMap((p) => [
      p.eci,
      p.low ?? p.eci,
      p.high ?? p.eci,
    ]);
    if (data.baseline != null) scores.push(data.baseline);
    const t0 = Math.min(...times) - 20 * DAY;
    const t1 = Math.max(...times) + 20 * DAY;
    const lo = Math.floor((Math.min(...scores) - 4) / 10) * 10;
    const hi = Math.ceil((Math.max(...scores) + 4) / 10) * 10;
    return { t0, t1, lo, hi };
  }, [data]);
  const x = (day: string) =>
    PAD.left + ((time(day) - frame.t0) / (frame.t1 - frame.t0 || 1)) * PLOT.w;
  const y = (v: number) =>
    PAD.top + PLOT.h - ((v - frame.lo) / (frame.hi - frame.lo || 1)) * PLOT.h;

  const frontier = useMemo(() => data.points.filter((p) => p.frontier), [data]);
  const startAt = data.baseline != null ? `M${PAD.left} ${y(data.baseline).toFixed(1)}` : "";
  const stepPath = frontier
    .map((p, i) =>
      i || startAt
        ? `H${x(p.date).toFixed(1)}V${y(p.eci).toFixed(1)}`
        : `M${x(p.date).toFixed(1)} ${y(p.eci).toFixed(1)}`,
    )
    .concat(frontier.length ? [`H${(PAD.left + PLOT.w).toFixed(1)}`] : [])
    .join("");
  const stepD = startAt + stepPath;
  const yTicks: number[] = [];
  for (let v = frame.lo; v <= frame.hi; v += 20) yTicks.push(v);
  const firstYear = new Date(frame.t0).getUTCFullYear() + 1;
  const years: number[] = [];
  for (let yr = firstYear; time(`${yr}-01-01`) < frame.t1; yr++) years.push(yr);

  const pick = (clientX: number, clientY: number): EciPoint | null => {
    const el = svg.current;
    const ctm = el?.getScreenCTM();
    if (!el || !ctm) return null;
    // The viewBox can be letterboxed inside the element (expanded view caps the
    // height), so map through the real screen transform, not the bounding box.
    const at = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    const px = at.x;
    const py = at.y;
    let best: EciPoint | null = null;
    let bestD = 20 * 20;
    for (const p of data.points) {
      const d = (x(p.date) - px) ** 2 + (y(p.eci) - py) ** 2;
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  };
  const nearest = (event: React.PointerEvent<SVGSVGElement>) =>
    setHover(pick(event.clientX, event.clientY));
  const label = hover ?? selected ?? pinned;
  // A model with its own pin goes there; the pin being read is already open.
  const linkOf = (p: EciPoint | null) =>
    p?.href && p.pinId !== pinId ? p.href : null;
  const hasThread = data.points.some((p) => p.thread && p.key !== data.pinned);
  const dotClass = (p: EciPoint) =>
    p.thread
      ? "fill-red-500 stroke-panel"
      : p.open
        ? "fill-panel stroke-muted"
        : p.frontier
          ? "fill-muted stroke-panel"
          : "fill-subtle/60 stroke-panel";

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
        aria-label={since ? t("pin.eciChart.headingSince", { year: String(since) }) : t("pin.eciChart.heading")}
        onClick={expanded ? (event) => event.stopPropagation() : undefined}
      >
        <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
          {since ? t("pin.eciChart.headingSince", { year: String(since) }) : t("pin.eciChart.heading")}
        </h2>
        <div className="surface rounded-lg px-3 py-3">
          <div className="mb-2 flex items-center justify-end gap-1.5">
            {toggle ? (
              <button
                type="button"
                aria-pressed={toggle.on}
                title={t("pin.eciChart.headingSince", {
                  year: String(toggle.year),
                })}
                onClick={() => toggle.set(!toggle.on)}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs tabular-nums ring-1 ring-inset transition-colors ${
                  toggle.on
                    ? "bg-accent/10 text-ink ring-accent"
                    : "bg-raised text-muted ring-line hover:bg-raised-2"
                }`}
              >
                {toggle.year}+
              </button>
            ) : null}
            {hasThread ? (
              <button
                type="button"
                aria-pressed={threadNames}
                aria-label={t("pin.modelChart.threadNames")}
                title={t("pin.modelChart.threadNames")}
                onClick={() => setThreadNames((v) => !v)}
                className={`inline-flex items-center rounded-full px-2.5 py-1.5 ring-1 ring-inset transition-colors ${
                  threadNames
                    ? "bg-red-500/10 ring-red-500"
                    : "bg-raised ring-line hover:bg-raised-2"
                }`}
              >
                <span
                  aria-hidden
                  className="inline-block size-2.5 rounded-full bg-red-500"
                />
              </button>
            ) : null}
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={
                expanded
                  ? t("pin.modelChart.collapse")
                  : t("pin.modelChart.expand")
              }
              title={
                expanded
                  ? t("pin.modelChart.collapse")
                  : t("pin.modelChart.expand")
              }
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
            aria-label={t("pin.eciChart.alt", {
              count: data.points.length,
              model: pinned ? `${pinned.name}: ${pinned.eci}` : "",
            })}
            onPointerMove={nearest}
            onPointerDown={nearest}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") setHover(null);
            }}
            onClick={(event) => setSelected(pick(event.clientX, event.clientY))}
            style={{ cursor: hover ? "pointer" : undefined }}
          >
            {yTicks.map((v) => (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + PLOT.w}
                  y1={y(v)}
                  y2={y(v)}
                  className="stroke-line"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 8}
                  y={y(v) + 4}
                  textAnchor="end"
                  className="fill-current text-[11px] text-faint tabular-nums"
                >
                  {v}
                </text>
              </g>
            ))}
            {years.map((yr) => (
              <g key={yr}>
                <line
                  x1={x(`${yr}-01-01`)}
                  x2={x(`${yr}-01-01`)}
                  y1={PAD.top}
                  y2={PAD.top + PLOT.h}
                  className="stroke-line"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
                <text
                  x={x(`${yr}-01-01`)}
                  y={PAD.top + PLOT.h + 16}
                  textAnchor="middle"
                  className="fill-current text-[11px] text-faint tabular-nums"
                >
                  {yr}
                </text>
              </g>
            ))}
            {/* The year the graph begins in, when its January line falls off the left edge. */}
            {!years.length || x(`${years[0]}-01-01`) - PAD.left > 40 ? (
              <text
                x={PAD.left}
                y={PAD.top + PLOT.h + 16}
                textAnchor="start"
                className="fill-current text-[11px] text-faint tabular-nums"
              >
                {new Date(frame.t0).getUTCFullYear()}
              </text>
            ) : null}
            <text
              transform={`translate(11${PAD.top + PLOT.h / 2}) rotate(-90)`}
              textAnchor="middle"
              className="fill-current text-[11px] text-subtle"
            >
              {t("pin.eciChart.eci")}
            </text>

            {stepPath ? (
              <path
                d={stepD}
                className="stroke-subtle"
                strokeWidth="1.5"
                fill="none"
                strokeLinejoin="round"
              />
            ) : null}

            {data.points
              .filter((p) => p.key !== data.pinned)
              .map((p) => (
                <circle
                  key={p.key}
                  cx={x(p.date)}
                  cy={y(p.eci)}
                  r={p.thread ? 5.5 : p.frontier ? 4.5 : 3.5}
                  className={dotClass(p)}
                  strokeWidth={p.open && !p.thread ? 1.5 : 1}
                />
              ))}

            {threadNames
              ? data.points
                  .filter(
                    (p) =>
                      p.thread &&
                      p.key !== data.pinned &&
                      p.key !== hover?.key &&
                      p.key !== selected?.key,
                  )
                  .map((p) => (
                    <text
                      key={p.key}
                      x={x(p.date) + 7}
                      y={y(p.eci) + 4}
                      className="fill-current text-[11px] font-medium text-red-600"
                    >
                      {p.name}
                    </text>
                  ))
              : null}

            {pinned ? (
              <g>
                {pinned.low != null && pinned.high != null ? (
                  <line
                    x1={x(pinned.date)}
                    x2={x(pinned.date)}
                    y1={y(pinned.low)}
                    y2={y(pinned.high)}
                    className="stroke-accent"
                    strokeWidth="2"
                  />
                ) : null}
                <circle
                  cx={x(pinned.date)}
                  cy={y(pinned.eci)}
                  r="15"
                  className="fill-accent/20 stroke-accent"
                  strokeWidth="1.5"
                />
                <circle
                  cx={x(pinned.date)}
                  cy={y(pinned.eci)}
                  r="7"
                  className="fill-accent stroke-panel"
                  strokeWidth="2"
                />
                <text
                  x={x(pinned.date)}
                  y={y(pinned.eci) - 22}
                  textAnchor={
                    x(pinned.date) > PAD.left + PLOT.w * 0.65
                      ? "end"
                      : x(pinned.date) < PAD.left + PLOT.w * 0.2
                        ? "start"
                        : "middle"
                  }
                  className="fill-current text-[12px] font-bold text-ink"
                >
                  {pinned.name}
                </text>
              </g>
            ) : null}

            {[
              selected,
              hover && hover.key !== selected?.key ? hover : null,
            ].map((p) =>
              p && p.key !== data.pinned ? (
                <g key={p.key}>
                  <circle
                    cx={x(p.date)}
                    cy={y(p.eci)}
                    r="9"
                    className="fill-ink/10 stroke-ink"
                    strokeWidth="2"
                  />
                  <text
                    x={x(p.date)}
                    y={y(p.eci) - 14}
                    textAnchor={
                      x(p.date) > PAD.left + PLOT.w * 0.65
                        ? "end"
                        : x(p.date) < PAD.left + PLOT.w * 0.2
                          ? "start"
                          : "middle"
                    }
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

          <div className="mt-1 min-h-5 text-xs">
            {label ? (
              <span className="text-ink tabular-nums">
                <span
                  className={`me-1.5 inline-block size-2 rounded-full align-middle ${label.key === data.pinned ? "bg-accent" : label.thread ? "bg-red-500" : "bg-subtle"}`}
                  aria-hidden
                />
                {linkOf(label) ? (
                  <Link
                    href={linkOf(label)!}
                    className="font-medium text-link hover:underline"
                  >
                    {label.name}
                  </Link>
                ) : (
                  <span className="font-medium">{label.name}</span>
                )}{" "}
                <span className="text-muted">
                  ECI {label.eci}
                  {label.low != null && label.high != null
                    ? ` (${label.low}–${label.high})`
                    : ""}{" "}
                  · {label.date}
                  {label.organization ? ` · ${label.organization}` : ""}
                </span>
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-subtle">
            {t("pin.eciChart.note")}{" "}
            <Anchor
              href="https://epoch.ai/eci"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link hover:underline"
            >
              {t("pin.eciChart.source")}
            </Anchor>
          </p>
        </div>
      </section>
    </div>
  );
}
