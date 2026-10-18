'use client';

import { useState } from 'react';
import type { ConfidenceStats, VisibilityCount } from '@/lib/confidenceStats';
import { type ChartView, niceScale, SERIES_BLUE, SERIES_ORANGE, StatTile, ViewTabs } from '../chartParts';

// Series colours, checked for colour-blind separation and 3:1 contrast on the
// panel (#181b21). Text never wears them; a swatch beside it carries identity.
const SHOWING = SERIES_BLUE;
const HIDDEN = SERIES_ORANGE;

type Tip = { x: number; y: number; title: string; showing: number; hidden: number };

const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '0%');

export function VisibilityCharts({ stats }: { stats: ConfidenceStats }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [grouping, setGrouping] = useState<'category' | 'author'>('category');
  const [view, setView] = useState<ChartView>('chart');
  const groups = grouping === 'category' ? stats.byCategory : stats.byAuthor;
  // Every distinct group, not just the rows charted: the rest sit in "Other".
  const groupCount = grouping === 'category' ? stats.categoryCount : stats.authorCount;
  const groupNoun = grouping === 'category' ? (groupCount === 1 ? 'category' : 'categories') : `author${groupCount === 1 ? '' : 's'}`;

  // Hover and keyboard focus show the same readout.
  const tipHandlers = (title: string, count: VisibilityCount) => ({
    tabIndex: 0,
    'aria-label': `${title}: ${count.showing} showing, ${count.hidden} hidden`,
    onPointerMove: (e: React.PointerEvent) => setTip({ x: e.clientX, y: e.clientY, title, ...count }),
    onPointerLeave: () => setTip(null),
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      const box = e.currentTarget.getBoundingClientRect();
      setTip({ x: box.left + box.width / 2, y: box.top, title, ...count });
    },
    onBlur: () => setTip(null),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Showing" swatch={SHOWING} value={stats.showing} note={`${percent(stats.showing, stats.total)} of ${stats.total} pins`} />
        <StatTile
          label="Hidden"
          swatch={HIDDEN}
          value={stats.hidden}
          note={stats.threshold === null ? 'filter is off' : `${percent(stats.hidden, stats.total)} scored below ${stats.threshold}`}
        />
        <StatTile label="Unscored" value={stats.unscored} note="shown, nothing to score" />
      </div>

      <section className="surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Pins by confidence score</h2>
          <Legend />
        </div>
        <Histogram stats={stats} tipHandlers={tipHandlers} />
      </section>

      <section className="surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-baseline gap-2 text-base font-semibold">
            Showing and hidden by {grouping}
            <span className="text-sm font-normal text-subtle tabular-nums">
              {groupCount} {groupNoun}
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {view === 'chart' ? <Legend /> : null}
            <ViewTabs view={view} onChange={setView} />
            <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Group by">
              {(['category', 'author'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={grouping === g}
                  onClick={() => setGrouping(g)}
                  className={`btn btn-sm ${grouping === g ? 'bg-raised text-ink' : 'btn-ghost'}`}
                >
                  {g === 'category' ? 'Category' : 'Author'}
                </button>
              ))}
            </div>
          </div>
        </div>
        {view === 'chart' ? (
          <GroupBars groups={groups} tipHandlers={tipHandlers} />
        ) : (
          <table role="tabpanel" className="w-full text-left text-sm tabular-nums">
            <thead className="text-subtle">
              <tr>
                <th className="py-1 font-medium">{grouping === 'category' ? 'Category' : 'Author'}</th>
                <th className="py-1 text-right font-medium">Showing</th>
                <th className="py-1 text-right font-medium">Hidden</th>
                <th className="py-1 text-right font-medium">Hidden %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {groups.map((g) => (
                <tr key={g.label}>
                  <td className="py-1">{g.label}</td>
                  <td className="py-1 text-right">{g.showing}</td>
                  <td className="py-1 text-right">{g.hidden}</td>
                  <td className="py-1 text-right">{percent(g.hidden, g.showing + g.hidden)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {tip ? <Tooltip tip={tip} /> : null}
    </div>
  );
}

type TipHandlers = (title: string, count: VisibilityCount) => React.HTMLAttributes<HTMLElement>;

function Legend() {
  return (
    <ul className="flex gap-3 text-xs text-muted">
      {[
        ['Showing', SHOWING],
        ['Hidden', HIDDEN],
      ].map(([label, color]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm" style={{ background: color }} />
          {label}
        </li>
      ))}
    </ul>
  );
}

function Histogram({ stats, tipHandlers }: { stats: ConfidenceStats; tipHandlers: TipHandlers }) {
  const { top, ticks } = niceScale(Math.max(...stats.bands.map((b) => b.showing + b.hidden)));
  const height = (n: number) => `${(n / top) * 100}%`;
  return (
    <div className="flex gap-2">
      {/* Y axis */}
      <div className="relative h-52 w-7 shrink-0 text-right text-[11px] text-faint tabular-nums">
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: height(t) }}>
            {t}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-52">
          {ticks.map((t) => (
            <div key={t} aria-hidden className={`absolute inset-x-0 h-px ${t === 0 ? 'bg-rail' : 'bg-line'}`} style={{ bottom: height(t) }} />
          ))}
          {/* The timeline's cutoff, placed on the 0-100 score scale. */}
          {stats.threshold !== null ? (
            <div aria-hidden className="absolute top-0 bottom-0 w-px bg-muted/60" style={{ left: `${stats.threshold}%` }}>
              <span className={`absolute -top-1 text-[11px] whitespace-nowrap text-muted ${stats.threshold > 85 ? 'right-1.5' : 'left-1.5'}`}>
                Cutoff {stats.threshold}
              </span>
            </div>
          ) : null}
          <div className="absolute inset-0 grid grid-cols-10">
            {stats.bands.map((band) => {
              const total = band.showing + band.hidden;
              return (
                <div
                  key={band.label}
                  {...tipHandlers(`Score ${band.label}`, band)}
                  className="group relative flex h-full flex-col items-center justify-end outline-none"
                >
                  {total ? (
                    <>
                      <span className="mb-1 text-[11px] text-muted tabular-nums">{total}</span>
                      <div className="flex w-full max-w-6 flex-col gap-[2px] group-hover:brightness-125 group-focus-visible:brightness-125" style={{ height: height(total) }}>
                        {band.showing ? <div className="rounded-t-[4px]" style={{ background: SHOWING, flexGrow: band.showing }} /> : null}
                        {band.hidden ? (
                          <div className={band.showing ? '' : 'rounded-t-[4px]'} style={{ background: HIDDEN, flexGrow: band.hidden }} />
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-1 grid grid-cols-10 text-center text-[11px] text-faint tabular-nums">
          {stats.bands.map((band) => (
            <span key={band.label}>{band.from}</span>
          ))}
        </div>
        <div className="mt-1 text-center text-xs text-subtle">Confidence score</div>
      </div>
    </div>
  );
}

function GroupBars({ groups, tipHandlers }: { groups: VisibilityCount[]; tipHandlers: TipHandlers }) {
  const max = Math.max(1, ...groups.map((g) => g.showing + g.hidden));
  return (
    <ul className="space-y-2">
      {groups.map((g) => {
        const total = g.showing + g.hidden;
        return (
          <li key={g.label} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm">
            <span className="truncate text-muted" title={g.label}>
              {g.label}
            </span>
            <div {...tipHandlers(g.label, g)} className="group flex items-center gap-2 py-1 outline-none">
              <div className="flex h-4 gap-[2px] group-hover:brightness-125 group-focus-visible:brightness-125" style={{ width: `${(total / max) * 100}%` }}>
                {g.showing ? <div className={g.hidden ? '' : 'rounded-r-[4px]'} style={{ background: SHOWING, flexGrow: g.showing }} /> : null}
                {g.hidden ? <div className="rounded-r-[4px]" style={{ background: HIDDEN, flexGrow: g.hidden }} /> : null}
              </div>
              <span className="shrink-0 text-xs text-subtle tabular-nums">
                {total}
                {g.hidden ? ` · ${percent(g.hidden, total)} hidden` : ''}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Tooltip({ tip }: { tip: Tip }) {
  const total = tip.showing + tip.hidden;
  return (
    <div
      role="tooltip"
      className="floating pointer-events-none fixed z-50 min-w-40 -translate-x-1/2 -translate-y-full px-3 py-2 text-xs"
      style={{ left: tip.x, top: tip.y - 12 }}
    >
      <div className="mb-1 text-subtle">{tip.title}</div>
      {[
        ['Showing', tip.showing, SHOWING],
        ['Hidden', tip.hidden, HIDDEN],
      ].map(([label, value, color]) => (
        <div key={label as string} className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: color as string }} />
          <strong className="text-ink tabular-nums">{value as number}</strong>
          <span className="text-muted">{label as string}</span>
          <span className="ml-auto pl-3 text-faint tabular-nums">{percent(value as number, total)}</span>
        </div>
      ))}
    </div>
  );
}
