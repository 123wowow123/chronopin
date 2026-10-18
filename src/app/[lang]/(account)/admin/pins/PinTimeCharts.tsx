'use client';

import { useMemo, useState } from 'react';
import { type CreatedPin, pinTimeStats, type PinTimeBucket } from '@/lib/confidenceStats';
import { TIME_RANGES, type TimeRange } from '@/lib/timeStats';
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

// Same colours as the visibility charts below.
const SERIES = [
  { label: 'Showing', color: SERIES_BLUE, value: (b: PinTimeBucket) => b.showing },
  { label: 'Hidden', color: SERIES_ORANGE, value: (b: PinTimeBucket) => b.hidden },
];

// Pins added over time, split by whether the timeline shows them today.
export function PinTimeCharts({
  pins,
  serverNow,
}: {
  pins: CreatedPin[];
  // When the server rendered, so the buckets match during hydration.
  serverNow: string;
}) {
  const [range, setRange] = useState<TimeRange>('30d');
  const [tip, setTip] = useState<ColumnTip<PinTimeBucket> | null>(null);
  const [view, setView] = useState<ChartView>('chart');
  const stats = useMemo(() => pinTimeStats(pins, range, new Date(serverNow)), [pins, range, serverNow]);
  const rangeLabel = TIME_RANGES.find((r) => r.id === range)!.label;

  return (
    <div className="mb-6 space-y-4">
      <RangeTabs range={range} onChange={setRange} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Total pins" value={pins.length} note="not deleted" />
        <StatTile label="Added" value={stats.added} note={`${range === 'all' ? 'all time' : `in the last ${rangeLabel}`}, ${stats.hidden} hidden now`} />
        <StatTile label="Add rate" value={formatRate(stats.perUnit)} note={`per ${stats.unit}`} />
      </div>

      <section className="surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Pins added per {stats.unit}</h2>
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
            describe={(b) => `${b.showing + b.hidden} added (${b.showing} showing, ${b.hidden} hidden), ${b.total} pins by then`}
            onTip={setTip}
          />
        ) : (
          <div role="tabpanel" className="max-h-72 overflow-y-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="py-1 font-medium capitalize">{stats.unit}</th>
                  <th className="py-1 text-right font-medium">Added</th>
                  <th className="py-1 text-right font-medium">Showing</th>
                  <th className="py-1 text-right font-medium">Hidden</th>
                  <th className="py-1 text-right font-medium">Pins by then</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...stats.buckets].reverse().map((b) => (
                  <tr key={b.start}>
                    <td className="py-1">{periodLabel(stats.unit, b.start)}</td>
                    <td className="py-1 text-right">{b.showing + b.hidden}</td>
                    <td className="py-1 text-right">{b.showing}</td>
                    <td className="py-1 text-right">{b.hidden}</td>
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
          {SERIES.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
              <strong className="text-ink tabular-nums">{s.value(tip.bucket)}</strong>
              <span className="text-muted">{s.label.toLowerCase()}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pl-5">
            <strong className="text-ink tabular-nums">{tip.bucket.total}</strong>
            <span className="text-muted">pins by then</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
