// Pieces shared by the admin charts.

import { TIME_RANGES, type TimeRange, type TimeUnit } from '@/lib/timeStats';

export const SERIES_BLUE = '#3987e5';
export const SERIES_ORANGE = '#d95926';

// A round axis top with at most four steps of 1, 2 or 5 times a power of ten,
// never finer than 1 since everything charted here is a count.
export function niceScale(max: number) {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough)!);
  const top = Math.ceil(max / step) * step;
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step) };
}

export type ChartView = 'chart' | 'table';

// Switches a chart card between the chart and the same numbers as a table.
export function ViewTabs({ view, onChange }: { view: ChartView; onChange: (view: ChartView) => void }) {
  return (
    <div className="flex rounded-lg border border-line p-0.5" role="tablist" aria-label="View">
      {(['chart', 'table'] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={view === v}
          onClick={() => onChange(v)}
          className={`btn btn-sm ${view === v ? 'bg-raised text-ink' : 'btn-ghost'}`}
        >
          {v === 'chart' ? 'Chart' : 'Table'}
        </button>
      ))}
    </div>
  );
}

export function RangeTabs({ range, onChange }: { range: TimeRange; onChange: (range: TimeRange) => void }) {
  return (
    <div className="flex rounded-lg border border-line p-0.5 sm:w-fit" role="group" aria-label="Date range">
      {TIME_RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          aria-pressed={range === r.id}
          onClick={() => onChange(r.id)}
          className={`btn btn-sm flex-1 ${range === r.id ? 'bg-raised text-ink' : 'btn-ghost'}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export function StatTile({ label, value, note, swatch }: { label: string; value: number | string; note: string; swatch?: string }) {
  return (
    <div className="surface px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-subtle">
        {swatch ? <span aria-hidden className="size-2.5 rounded-sm" style={{ background: swatch }} /> : null}
        {label}
      </div>
      <div className="mt-1 text-3xl font-semibold text-ink">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-xs text-subtle">{note}</div>
    </div>
  );
}

const utc = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options });
const DAY = utc({ month: 'short', day: 'numeric' });
const MONTH = utc({ month: 'short', year: 'numeric' });

export function periodLabel(unit: TimeUnit, start: string) {
  const date = new Date(start);
  if (unit === 'month') return MONTH.format(date);
  return unit === 'week' ? `Week of ${DAY.format(date)}` : DAY.format(date);
}

function axisLabel(unit: TimeUnit, start: string) {
  const date = new Date(start);
  return unit === 'month' ? MONTH.format(date) : DAY.format(date);
}

// An average per unit: whole numbers once it reaches 10, one decimal below.
export function formatRate(perUnit: number) {
  return perUnit >= 10 ? Math.round(perUnit).toLocaleString() : perUnit.toFixed(1).replace(/\.0$/, '');
}

export type ColumnTip<B> = { x: number; y: number; bucket: B };

// One column per period, its series stacked with the first on top.
export function TimeColumns<B extends { start: string }>({
  buckets,
  unit,
  series,
  describe,
  onTip,
}: {
  buckets: B[];
  unit: TimeUnit;
  series: { color: string; value: (bucket: B) => number }[];
  // The column's accessible name.
  describe: (bucket: B) => string;
  onTip: (tip: ColumnTip<B> | null) => void;
}) {
  const sum = (bucket: B) => series.reduce((total, s) => total + s.value(bucket), 0);
  const { top, ticks } = niceScale(Math.max(0, ...buckets.map(sum)));
  const height = (n: number) => `${(n / top) * 100}%`;
  // At most six date labels, spread evenly and always including the latest.
  const every = Math.max(1, Math.ceil(buckets.length / 6));
  const labelled = (i: number) => (buckets.length - 1 - i) % every === 0;

  return (
    <div className="flex gap-2">
      <div className="relative h-44 w-7 shrink-0 text-right text-[11px] text-faint tabular-nums">
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: height(t) }}>
            {t}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-44">
          {ticks.map((t) => (
            <div key={t} aria-hidden className={`absolute inset-x-0 h-px ${t === 0 ? 'bg-rail' : 'bg-line'}`} style={{ bottom: height(t) }} />
          ))}
          <div className="absolute inset-0 flex gap-[2px]">
            {buckets.map((bucket) => (
              <div
                key={bucket.start}
                tabIndex={0}
                aria-label={`${periodLabel(unit, bucket.start)}: ${describe(bucket)}`}
                onPointerMove={(e) => onTip({ x: e.clientX, y: e.clientY, bucket })}
                onPointerLeave={() => onTip(null)}
                onFocus={(e) => {
                  const box = e.currentTarget.getBoundingClientRect();
                  onTip({ x: box.left + box.width / 2, y: box.top, bucket });
                }}
                onBlur={() => onTip(null)}
                className="group flex h-full min-w-0 flex-1 items-end justify-center outline-none"
              >
                <div
                  className="flex w-full max-w-6 flex-col gap-[2px] group-hover:brightness-125 group-focus-visible:brightness-125"
                  style={{ height: height(sum(bucket)) }}
                >
                  {series
                    .filter((s) => s.value(bucket))
                    .map((s, i) => (
                      <div key={s.color} className={i === 0 ? 'rounded-t-[4px]' : ''} style={{ background: s.color, flexGrow: s.value(bucket) }} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-1 h-4 text-[11px] text-faint">
          {buckets.map((bucket, i) =>
            labelled(i) ? (
              <span
                key={bucket.start}
                // Phones get every other label, still ending on the latest.
                className={`absolute whitespace-nowrap ${((buckets.length - 1 - i) / every) % 2 ? 'hidden sm:block' : ''}`}
                // The latest label ends at the right edge rather than overhanging it.
                style={
                  i === buckets.length - 1
                    ? { right: 0 }
                    : { left: `${((i + 0.5) / buckets.length) * 100}%`, transform: 'translateX(-50%)' }
                }
              >
                {axisLabel(unit, bucket.start)}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
