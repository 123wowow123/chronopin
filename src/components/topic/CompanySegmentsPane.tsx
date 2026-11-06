'use client';

import Link from '@/components/ui/Link';
import { useState, type CSSProperties } from 'react';

export type SegmentPart = { segment: string; colour: string; amount: string; share: string; shareLabel: string; change: string | null; changeLabel: string | null; sharePct: number; pinId: number | null };
export type SegmentColumn = { key: string; period: string; total: string; heightPct: number; parts: (SegmentPart & { heightPct: number })[] };

type Active = { segment: string; column: string; x: number; y: number } | null;

// The pane itself, client-side only for the hover: pointing at a segment of the
// latest-quarter bar, its legend row or a quarter's column dims the rest, lifts
// that segment and opens a tooltip with the figures. Every string arrives
// already translated and formatted from the server wrapper (CompanySegments).
export function CompanySegmentsPane({ heading, note, yoyNote, latest, columns, className }: { heading: string; note: string; yoyNote: string; latest: SegmentColumn; columns: SegmentColumn[]; className?: string }) {
  const [active, setActive] = useState<Active>(null);
  const hit = active ? columns.find((c) => c.key === active.column)?.parts.find((p) => p.segment === active.segment) : undefined;
  const period = active ? columns.find((c) => c.key === active.column)?.period : undefined;

  const on = (segment: string, column: string) => ({
    onPointerMove: (e: React.PointerEvent) => setActive({ segment, column, x: e.clientX, y: e.clientY }),
    onPointerLeave: () => setActive(null),
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setActive({ segment, column, x: r.left + r.width / 2, y: r.top });
    },
    onBlur: () => setActive(null),
  });
  const style = (segment: string, colour: string, extra?: CSSProperties): CSSProperties => ({
    background: colour,
    opacity: !active || active.segment === segment ? 1 : 0.55,
    filter: active?.segment === segment ? 'brightness(1.06)' : undefined,
    transition: 'opacity 150ms, filter 150ms, transform 150ms',
    ...extra,
  });

  return (
    <section aria-labelledby="segments-heading" className={`rounded-2xl border border-line bg-panel p-5 sm:p-6 ${className ?? ''}`}>
      <h2 id="segments-heading" className="text-xl font-semibold tracking-tight">
        {heading}
      </h2>
      <p className="mt-1 text-sm text-muted">{note}</p>
      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <p className="text-xs font-semibold tracking-wide text-subtle uppercase">
            {latest.period} · {latest.total}
          </p>
          <div className="mt-3 flex h-5 rounded-full bg-raised" role="group" aria-label={latest.parts.map((p) => `${p.segment} ${p.amount}`).join(', ')}>
            {latest.parts.map((p, i) => (
              <span
                key={p.segment}
                tabIndex={0}
                aria-label={`${p.segment}: ${p.amount}`}
                {...on(p.segment, latest.key)}
                className={`block h-full cursor-default outline-offset-2 ${i === 0 ? 'rounded-s-full' : ''} ${i === latest.parts.length - 1 ? 'rounded-e-full' : ''}`}
                style={style(p.segment, p.colour, { width: `${p.sharePct}%`, transform: active?.segment === p.segment ? 'scaleY(1.2)' : undefined })}
              />
            ))}
          </div>
          <ul className="mt-4 divide-y divide-line text-sm">
            {latest.parts.map((p) => (
              <li key={p.segment} {...on(p.segment, latest.key)} className="flex items-center gap-3 py-2.5 transition-opacity" style={{ opacity: !active || active.segment === p.segment ? 1 : 0.6 }}>
                <span aria-hidden className="size-3 shrink-0 rounded-sm" style={{ background: p.colour, transform: active?.segment === p.segment ? 'scale(1.15)' : undefined, transition: 'transform 150ms' }} />
                <span className="min-w-0 flex-1 font-medium">{p.segment}</span>
                <span className="text-muted tabular-nums">{p.share}</span>
                <span className="w-16 text-end font-medium tabular-nums">{p.pinId ? <Link href={`/pin/${p.pinId}`}>{p.amount}</Link> : p.amount}</span>
                {p.change ? <span className={`w-12 text-end text-xs tabular-nums ${p.change.startsWith('-') ? 'text-danger' : 'text-success'}`}>{p.change}</span> : <span className="w-12" />}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-subtle">{yoyNote}</p>
        </div>
        <ol className="flex h-56 items-end gap-3 sm:gap-4" aria-label={heading}>
          {columns.map((c) => (
            <li key={c.key} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              <span className="mb-1 text-center text-xs font-medium text-ink tabular-nums">{c.total}</span>
              <div className="flex flex-col-reverse rounded-md" style={{ height: `${c.heightPct}%` }}>
                {c.parts.map((p, i) => (
                  <span
                    key={p.segment}
                    tabIndex={0}
                    aria-label={`${c.period}, ${p.segment}: ${p.amount}`}
                    {...on(p.segment, c.key)}
                    className={`block w-full cursor-default outline-offset-2 ${i === 0 ? 'rounded-b-md' : ''} ${i === c.parts.length - 1 ? 'rounded-t-md' : ''}`}
                    style={style(p.segment, p.colour, {
                      height: `${p.heightPct}%`,
                      zIndex: active?.segment === p.segment && active.column === c.key ? 1 : 0,
                      transform: active?.segment === p.segment && active.column === c.key ? 'scale(1.02)' : undefined,
                      boxShadow: active?.segment === p.segment && active.column === c.key ? '0 2px 8px rgb(0 0 0 / 0.18)' : undefined,
                    })}
                  />
                ))}
              </div>
              <span className="mt-1.5 text-center text-[11px] text-subtle">{c.period}</span>
            </li>
          ))}
        </ol>
      </div>
      {active && hit ? (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 w-64 rounded-xl border border-line bg-popover p-3 text-sm shadow-xl"
          style={{ left: Math.max(8, Math.min(active.x + 14, (typeof window === 'undefined' ? 1200 : window.innerWidth) - 272)), top: Math.max(8, active.y - 110) }}
        >
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-subtle uppercase">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: hit.colour }} />
            {period}
          </p>
          <p className="mt-1 font-semibold text-ink">{hit.segment}</p>
          <p className="mt-0.5 text-xl font-semibold text-ink tabular-nums">{hit.amount}</p>
          <p className="mt-1 text-xs text-muted">{hit.shareLabel}</p>
          {hit.changeLabel ? <p className={`text-xs ${hit.change?.startsWith('-') ? 'text-danger' : 'text-success'}`}>{hit.changeLabel}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
