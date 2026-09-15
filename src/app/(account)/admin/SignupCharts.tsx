'use client';

import { useMemo, useState } from 'react';
import { signupStats, type SignupBucket } from '@/lib/signupStats';
import { TIME_RANGES, type TimeRange } from '@/lib/timeStats';
import {
  type ChartView,
  type ColumnTip,
  formatRate,
  periodLabel,
  RangeTabs,
  SERIES_BLUE,
  StatTile,
  TimeColumns,
  ViewTabs,
} from './chartParts';

const SIGNUPS = [{ color: SERIES_BLUE, value: (b: SignupBucket) => b.signups }];

// Sign-ups over time and the account total, above the admin user list.
export function SignupCharts({
  createdTimes,
  liveCount,
  deletedCount,
  serverNow,
}: {
  createdTimes: string[];
  liveCount: number;
  deletedCount: number;
  // When the server rendered, so the buckets match during hydration.
  serverNow: string;
}) {
  const [range, setRange] = useState<TimeRange>('30d');
  const [tip, setTip] = useState<ColumnTip<SignupBucket> | null>(null);
  const [view, setView] = useState<ChartView>('chart');
  const stats = useMemo(() => signupStats(createdTimes, range, new Date(serverNow)), [createdTimes, range, serverNow]);
  const rangeLabel = TIME_RANGES.find((r) => r.id === range)!.label;

  return (
    <div className="mb-8 space-y-4">
      <RangeTabs range={range} onChange={setRange} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Total users" value={liveCount} note={deletedCount ? `plus ${deletedCount} deleted` : 'active accounts'} />
        <StatTile label="Sign-ups" swatch={SERIES_BLUE} value={stats.signups} note={range === 'all' ? 'all time' : `in the last ${rangeLabel}`} />
        <StatTile label="Sign-up rate" value={formatRate(stats.perUnit)} note={`per ${stats.unit}`} />
      </div>

      <section className="surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Sign-ups per {stats.unit}</h2>
          <ViewTabs view={view} onChange={setView} />
        </div>
        {view === 'chart' ? (
          <TimeColumns
            buckets={stats.buckets}
            unit={stats.unit}
            series={SIGNUPS}
            describe={(b) => `${b.signups} sign-ups, ${b.total} accounts by then`}
            onTip={setTip}
          />
        ) : (
          <div role="tabpanel" className="max-h-72 overflow-y-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="py-1 font-medium capitalize">{stats.unit}</th>
                  <th className="py-1 text-right font-medium">Sign-ups</th>
                  <th className="py-1 text-right font-medium">Accounts by then</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...stats.buckets].reverse().map((b) => (
                  <tr key={b.start}>
                    <td className="py-1">{periodLabel(stats.unit, b.start)}</td>
                    <td className="py-1 text-right">{b.signups}</td>
                    <td className="py-1 text-right">{b.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {tip ? (
        <div
          role="tooltip"
          className="floating pointer-events-none fixed z-50 min-w-40 -translate-x-1/2 -translate-y-full px-3 py-2 text-xs"
          style={{ left: tip.x, top: tip.y - 12 }}
        >
          <div className="mb-1 text-subtle">{periodLabel(stats.unit, tip.bucket.start)}</div>
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: SERIES_BLUE }} />
            <strong className="text-ink tabular-nums">{tip.bucket.signups}</strong>
            <span className="text-muted">sign-ups</span>
          </div>
          <div className="flex items-center gap-2 pl-5">
            <strong className="text-ink tabular-nums">{tip.bucket.total}</strong>
            <span className="text-muted">accounts by then</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
