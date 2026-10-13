'use client';

import { useState } from 'react';

type Day = { day: string; impressions: number; uniques?: number; clicks: number };

function label(day: string): string {
  // Example data names its days ("Day 3") instead of dating them.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// One stacked bar per day: the clicks in green at the bottom and the rest of
// the day's impressions in blue above them (a click is an impression that was
// acted on, so the whole bar is the impressions and the green part is how many
// of them led to a click). Hovering, or tabbing to, a bar shows that day's numbers at once,
// in a bubble over it; the native title tooltip waits a second and never
// shows on a phone.
export function AdChart({ days }: { days: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const peak = Math.max(1, ...days.map((d) => d.impressions));
  const current = active != null ? days[active] : null;
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
        <span>{days.length && !/^\d{4}-/.test(days[0].day) ? 'Per day' : 'Per day, last 30 days'}</span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-accent/70" />
          Impressions
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-success" />
          Clicks
        </span>
      </div>
      <div className="relative pt-12" onMouseLeave={() => setActive(null)}>
        {current ? (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded border border-line bg-raised px-2 py-1 text-xs whitespace-nowrap shadow-md"
            style={{ left: `clamp(5.5rem, ${((active! + 0.5) / days.length) * 100}%, calc(100% - 5.5rem))` }}
          >
            <span className="block font-medium">{label(current.day)}</span>
            <span className="flex items-center gap-1.5 tabular-nums text-muted">
              <span aria-hidden className="size-2 rounded-sm bg-accent/70" />
              {current.impressions.toLocaleString('en-US')} impressions
            </span>
            {current.uniques != null ? (
              <span className="flex items-center gap-1.5 tabular-nums text-muted">
                <span aria-hidden className="size-2" />
                {current.uniques.toLocaleString('en-US')} unique people
              </span>
            ) : null}
            <span className="flex items-center gap-1.5 tabular-nums text-muted">
              <span aria-hidden className="size-2 rounded-sm bg-success" />
              {current.clicks.toLocaleString('en-US')} clicks
              {current.impressions ? ` (${((current.clicks / current.impressions) * 100).toFixed(1)}%)` : ''}
            </span>
          </div>
        ) : null}
        <div className="flex h-24 items-end gap-0.5">
          {days.map((d, i) => {
            const total = (d.impressions / peak) * 100;
            // The clicks are a slice of the bar, but never thinner than a
            // visible sliver, so a day with one click still shows it.
            const clickShare = d.impressions ? Math.max(d.clicks ? 6 : 0, (d.clicks / d.impressions) * 100) : 0;
            return (
              <button
                key={d.day}
                type="button"
                aria-label={`${label(d.day)}: ${d.impressions} impressions${d.uniques != null ? `, ${d.uniques} unique people` : ''}, ${d.clicks} clicks`}
                className="flex h-full min-w-1 flex-1 cursor-default items-end outline-none"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <span
                  className={`flex w-full flex-col overflow-hidden rounded-t transition-opacity ${active != null && active !== i ? 'opacity-60' : ''}`}
                  style={{ height: `${Math.max(4, total)}%` }}
                >
                  <span className="min-h-px flex-1 bg-accent/70" />
                  <span className="bg-success" style={{ height: `${clickShare}%` }} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
