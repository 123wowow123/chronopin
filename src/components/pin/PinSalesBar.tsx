"use client";

import { useState } from "react";

export type SalesBarSegment = {
  key: string;
  label: string; // "2026"
  valueText: string; // "2.45M" or "$1.2B"
  pct: number; // share of this row's value, 0-100
  color: string;
};

// One sales-figure row: label + value, a bar split into yearly segments, and
// the source link. Hovering or focusing a segment shows that year's figure in
// the value spot and dims the other years.
export function PinSalesBar({
  label,
  valueText,
  widthPct,
  segments,
  sourceHref,
  sourceText,
}: {
  label: string;
  valueText: string;
  widthPct: number;
  segments: SalesBarSegment[];
  sourceHref: string;
  sourceText: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const hovered = segments.find((seg) => seg.key === active) ?? null;
  const split = segments.length > 1;
  return (
    <li className="grid gap-1 px-4 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-muted">{label}</span>
        <span
          className="shrink-0 font-semibold text-ink tabular-nums"
          aria-live="polite"
        >
          {hovered ? (
            <>
              <span className="font-normal text-muted">{hovered.label} · </span>
              {hovered.valueText}
            </>
          ) : (
            valueText
          )}
        </span>
      </div>
      <div
        className="relative flex h-4 items-center"
        onMouseLeave={() => setActive(null)}
      >
        <div
          className="absolute inset-x-0 h-1.5 rounded-full bg-raised"
          aria-hidden="true"
        />
        <div
          className="relative flex h-full gap-0.5"
          style={{ width: `${widthPct}%` }}
        >
          {segments.map((seg, i) => (
            <div
              key={seg.key}
              className="flex h-full items-center outline-none"
              style={{ width: `${seg.pct}%` }}
              tabIndex={split ? 0 : -1}
              aria-label={split ? `${seg.label}: ${seg.valueText}` : undefined}
              onMouseEnter={split ? () => setActive(seg.key) : undefined}
              onFocus={split ? () => setActive(seg.key) : undefined}
              onBlur={split ? () => setActive(null) : undefined}
            >
              <div
                className={`h-1.5 w-full transition-opacity ${
                  i === 0 ? "rounded-l-full" : ""
                } ${i === segments.length - 1 ? "rounded-r-full" : ""} ${
                  hovered && hovered.key !== seg.key ? "opacity-40" : ""
                }`}
                style={{ background: seg.color }}
              />
            </div>
          ))}
        </div>
      </div>
      <a
        href={sourceHref}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="w-fit text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        {sourceText} ↗
      </a>
    </li>
  );
}
