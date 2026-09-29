'use client';

import { useMemo, useState } from 'react';
import { type BotBucket, type BotDay, botStats } from '@/lib/botStats';
import { botKindLabel, type BotKind } from '@/lib/bots';
import { TIME_RANGES, type TimeRange } from '@/lib/timeStats';
import {
  type ChartView,
  type ColumnTip,
  formatRate,
  periodLabel,
  RangeTabs,
  SERIES_AQUA,
  SERIES_BLUE,
  SERIES_ORANGE,
  SERIES_YELLOW,
  StatTile,
  TimeColumns,
  ViewTabs,
} from '../chartParts';

export type BotSummary = {
  botCount: number;
  bots: { bot: string; kind: BotKind; hits: number; pages: number; lastSeen: string; userAgent: string }[];
  paths: { path: string; hits: number; bots: number }[];
};

// Fixed per kind, so a kind keeps its colour whatever the range shows.
const COLOR: Record<BotKind, string> = { search: SERIES_BLUE, ai: SERIES_ORANGE, social: SERIES_AQUA, other: SERIES_YELLOW };

const SERIES = (['search', 'ai', 'social', 'other'] as const).map((kind) => ({
  kind,
  label: botKindLabel(kind),
  color: COLOR[kind],
  value: (b: BotBucket) => b[kind],
}));

const total = (b: BotBucket) => SERIES.reduce((n, s) => n + s.value(b), 0);

// How long before the page was rendered, measured from the server's clock so
// the text is the same on both sides of hydration.
function ago(iso: string, now: Date) {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// Bot requests over time by kind of bot, which bots came, and what they took.
export function BotCharts({
  days,
  summaries,
  serverNow,
}: {
  days: BotDay[];
  summaries: Record<TimeRange, BotSummary>;
  // When the server rendered, so the buckets match during hydration.
  serverNow: string;
}) {
  const [range, setRange] = useState<TimeRange>('30d');
  const [tip, setTip] = useState<ColumnTip<BotBucket> | null>(null);
  const [view, setView] = useState<ChartView>('chart');
  const now = useMemo(() => new Date(serverNow), [serverNow]);
  const stats = useMemo(() => botStats(days, range, now), [days, range, now]);
  const summary = summaries[range];
  const rangeLabel = TIME_RANGES.find((r) => r.id === range)!.label;
  const inRange = range === 'all' ? 'all time' : `in the last ${rangeLabel}`;
  const share = (n: number) => (stats.requests ? `${Math.round((n / stats.requests) * 100)}%` : '0%');

  return (
    <div className="mb-8 space-y-4">
      <RangeTabs range={range} onChange={setRange} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Bot requests" value={stats.requests} note={`${inRange}, ${formatRate(stats.perUnit)} per ${stats.unit}`} />
        <StatTile label="Distinct bots" value={summary.botCount} note={inRange} />
        <StatTile label="AI crawlers" value={share(stats.byKind.ai)} note={`of requests, ${stats.byKind.ai.toLocaleString()} in all`} swatch={COLOR.ai} />
      </div>

      <section className="surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Requests per {stats.unit}</h2>
          <div className="flex flex-wrap items-center gap-3">
            {view === 'chart' ? (
              <ul className="flex flex-wrap gap-3 text-xs text-muted">
                {SERIES.map((s) => (
                  <li key={s.kind} className="flex items-center gap-1.5">
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
            describe={(b) => `${total(b)} requests (${SERIES.map((s) => `${s.value(b)} ${s.label.toLowerCase()}`).join(', ')})`}
            onTip={setTip}
          />
        ) : (
          <div role="tabpanel" className="max-h-72 overflow-y-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="py-1 font-medium capitalize">{stats.unit}</th>
                  <th className="py-1 text-right font-medium">All</th>
                  {SERIES.map((s) => (
                    <th key={s.kind} className="py-1 pl-3 text-right font-medium">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...stats.buckets].reverse().map((b) => (
                  <tr key={b.start}>
                    <td className="py-1">{periodLabel(stats.unit, b.start)}</td>
                    <td className="py-1 text-right">{total(b)}</td>
                    {SERIES.map((s) => (
                      <td key={s.kind} className="py-1 pl-3 text-right">
                        {s.value(b)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold">By bot</h2>
        {summary.bots.length ? (
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="w-full py-1 font-medium">Bot</th>
                  <th className="py-1 pl-6 text-right font-medium whitespace-nowrap">Requests</th>
                  <th className="py-1 pl-6 text-right font-medium whitespace-nowrap">Pages</th>
                  <th className="py-1 pl-6 text-right font-medium whitespace-nowrap">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.bots.map((b) => (
                  <tr key={b.bot}>
                    <td className="w-full max-w-0 py-1.5">
                      {/* The full user agent on hover: what the name was read from. */}
                      <div className="flex items-center gap-2" title={b.userAgent}>
                        <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: COLOR[b.kind] }} />
                        <span className="truncate text-ink">{b.bot}</span>
                        {/* On a phone the swatch alone says the kind, so the name keeps the room. */}
                        <span className="shrink-0 text-xs text-subtle max-sm:hidden">{botKindLabel(b.kind)}</span>
                      </div>
                    </td>
                    <td className="py-1.5 pl-6 text-right">{b.hits.toLocaleString()}</td>
                    <td className="py-1.5 pl-6 text-right">{b.pages.toLocaleString()}</td>
                    <td className="py-1.5 pl-6 text-right whitespace-nowrap" title={b.lastSeen}>
                      {ago(b.lastSeen, now)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {summary.botCount > summary.bots.length ? (
              <p className="mt-2 text-xs text-subtle">
                The {summary.bots.length} busiest of {summary.botCount} bots {inRange}.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-subtle">No bot requests {inRange}.</p>
        )}
      </section>

      <section className="surface p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold">Most crawled pages</h2>
        {summary.paths.length ? (
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="w-full py-1 font-medium">Page</th>
                  <th className="py-1 pl-6 text-right font-medium whitespace-nowrap">Requests</th>
                  <th className="py-1 pl-6 text-right font-medium whitespace-nowrap">Bots</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.paths.map((p) => (
                  <tr key={p.path}>
                    <td className="w-full max-w-0 py-1.5">
                      {/* The path as the bot asked for it, language prefix and all. */}
                      <a href={p.path} title={p.path} className="block truncate text-link">
                        {p.path}
                      </a>
                    </td>
                    <td className="py-1.5 pl-6 text-right">{p.hits.toLocaleString()}</td>
                    <td className="py-1.5 pl-6 text-right">{p.bots}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-subtle">No pages crawled {inRange}.</p>
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
            <div key={s.kind} className="flex items-center gap-2">
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
