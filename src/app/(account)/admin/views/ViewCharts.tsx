'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PinThumb } from '@/components/pin/PinThumb';
import { pinPath } from '@/lib/seo';
import { TIME_RANGES, type TimeRange } from '@/lib/timeStats';
import { type ViewBucket, type ViewDay, viewStats } from '@/lib/viewStats';
import {
  type ChartView,
  type ColumnTip,
  formatRate,
  periodLabel,
  RangeTabs,
  SERIES_BLUE,
  SERIES_ORANGE,
  StatTile,
  TimeColumns,
  ViewTabs,
} from '../chartParts';

export type RangeSummary = {
  viewers: number;
  top: {
    id: number;
    title: string;
    views: number;
    viewers: number;
    thumbName?: string | null;
    originalUrl?: string | null;
  }[];
};

const SERIES = [
  { label: 'Signed in', color: SERIES_BLUE, value: (b: ViewBucket) => b.signedIn },
  { label: 'Guests', color: SERIES_ORANGE, value: (b: ViewBucket) => b.guests },
];

// Pin page views over time and the most-viewed pins for the chosen range.
export function ViewCharts({
  days,
  summaries,
  serverNow,
}: {
  days: ViewDay[];
  summaries: Record<TimeRange, RangeSummary>;
  // When the server rendered, so the buckets match during hydration.
  serverNow: string;
}) {
  const [range, setRange] = useState<TimeRange>('30d');
  const [tip, setTip] = useState<ColumnTip<ViewBucket> | null>(null);
  const [view, setView] = useState<ChartView>('chart');
  const stats = useMemo(() => viewStats(days, range, new Date(serverNow)), [days, range, serverNow]);
  const summary = summaries[range];
  const rangeLabel = TIME_RANGES.find((r) => r.id === range)!.label;
  const inRange = range === 'all' ? 'all time' : `in the last ${rangeLabel}`;

  return (
    <div className="mb-8 space-y-4">
      <RangeTabs range={range} onChange={setRange} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Views"
          value={stats.views}
          note={`${inRange}, ${stats.views ? Math.round((stats.signedIn / stats.views) * 100) : 0}% signed in`}
        />
        <StatTile label="Unique viewers" value={summary.viewers} note={inRange} />
        <StatTile label="View rate" value={formatRate(stats.perUnit)} note={`per ${stats.unit}`} />
      </div>

      <section className="surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Views per {stats.unit}</h2>
          <div className="flex flex-wrap items-center gap-3">
            {view === 'chart' ? (
              <ul className="flex gap-3 text-xs text-muted">
                {SERIES.map((s) => (
                  <li key={s.label} className="flex items-center gap-1.5">
                    <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
                    {s.label}
                  </li>
                ))}
              </ul>
            ) : null}
            <ViewTabs view={view} onChange={setView} />
          </div>
        </div>
        {view === 'chart' ? (
          <TimeColumns
            buckets={stats.buckets}
            unit={stats.unit}
            series={SERIES}
            describe={(b) => `${b.signedIn + b.guests} views (${b.signedIn} signed in, ${b.guests} guests)`}
            onTip={setTip}
          />
        ) : (
          <div role="tabpanel" className="max-h-72 overflow-y-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="py-1 font-medium capitalize">{stats.unit}</th>
                  <th className="py-1 text-right font-medium">Views</th>
                  <th className="py-1 text-right font-medium">Signed in</th>
                  <th className="py-1 text-right font-medium">Guests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...stats.buckets].reverse().map((b) => (
                  <tr key={b.start}>
                    <td className="py-1">{periodLabel(stats.unit, b.start)}</td>
                    <td className="py-1 text-right">{b.signedIn + b.guests}</td>
                    <td className="py-1 text-right">{b.signedIn}</td>
                    <td className="py-1 text-right">{b.guests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold">Most viewed pins</h2>
        {summary.top.length ? (
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="w-full py-1 font-medium">Pin</th>
                  <th className="py-1 pl-6 text-right font-medium whitespace-nowrap">Views</th>
                  <th className="py-1 pl-6 text-right font-medium whitespace-nowrap">Viewers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.top.map((p) => (
                  <tr key={p.id}>
                    <td className="w-full max-w-0 py-1.5">
                      <Link href={pinPath(p)} title={p.title} className="flex items-center gap-3 text-link">
                        <PinThumb thumbName={p.thumbName} originalUrl={p.originalUrl} />
                        <span className="truncate">{p.title || `Pin ${p.id}`}</span>
                      </Link>
                    </td>
                    <td className="py-1.5 pl-6 text-right">{p.views}</td>
                    <td className="py-1.5 pl-6 text-right">{p.viewers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-subtle">No pin views {inRange}.</p>
        )}
      </section>

      {tip ? (
        <div
          role="tooltip"
          className="floating pointer-events-none fixed z-50 min-w-40 -translate-x-1/2 -translate-y-full px-3 py-2 text-xs"
          style={{ left: tip.x, top: tip.y - 12 }}
        >
          <div className="mb-1 text-subtle">{periodLabel(stats.unit, tip.bucket.start)}</div>
          {SERIES.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
              <strong className="text-ink tabular-nums">{s.value(tip.bucket)}</strong>
              <span className="text-muted">{s.label.toLowerCase()}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
