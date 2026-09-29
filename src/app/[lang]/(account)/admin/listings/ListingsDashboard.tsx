'use client';

import { useMemo, useState } from 'react';
import Link from '@/components/ui/Link';
import { blobUrl } from '@/lib/appConfig';
import { LISTING_KINDS, listingHref, type ListingKind, type ListingStatus } from '@/lib/listings';
import { TIME_RANGES, timeBuckets, type TimeRange } from '@/lib/timeStats';
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

export type AdminListingRow = {
  id: number;
  pinId: number | null;
  kind: ListingKind;
  status: ListingStatus;
  title: string;
  price: number | null;
  currency: string;
  photo: string | null;
  locationName: string | null;
  utcCreatedDateTime: string;
  utcUpdatedDateTime: string;
  utcDeletedDateTime: string | null;
  sellerId: number;
  sellerName: string;
  pinTitle: string | null;
  chats: number;
  ratings: number;
  stars: number | null;
};

// Where a listing stands for the admin: its status, unless its seller
// deleted it.
type State = 'open' | 'pending' | 'closed' | 'removed';

const STATES: { id: State; label: string; color: string; note: string }[] = [
  { id: 'open', label: 'Open', color: SERIES_BLUE, note: 'available to buyers' },
  { id: 'pending', label: 'Pending', color: SERIES_YELLOW, note: 'on hold for a buyer' },
  { id: 'closed', label: 'Closed', color: SERIES_AQUA, note: 'marked sold' },
  { id: 'removed', label: 'Removed', color: SERIES_ORANGE, note: 'deleted by the seller' },
];

const STATE_OF: Record<ListingStatus, State> = { available: 'open', pending: 'pending', sold: 'closed' };
const stateOf = (l: AdminListingRow): State => (l.utcDeletedDateTime ? 'removed' : STATE_OF[l.status]);

const KIND_LABELS: Record<ListingKind, string> = { item: 'Items', vehicle: 'Vehicles', home: 'Homes', job: 'Jobs' };

// UTC, like the other admin charts, so the server and client render the same day.
const day = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

function money(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
}

// Sums per currency, largest first: "$12,400 · €300".
function totals(listings: AdminListingRow[]) {
  const sums = new Map<string, number>();
  for (const l of listings) if (l.price) sums.set(l.currency, (sums.get(l.currency) ?? 0) + l.price);
  return [...sums].sort((a, b) => b[1] - a[1]).map(([currency, sum]) => money(sum, currency));
}

const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '—');

type Bucket = { start: string } & Record<State, number>;

export function ListingsDashboard({ listings, serverNow }: { listings: AdminListingRow[]; serverNow: string }) {
  const [range, setRange] = useState<TimeRange>('30d');
  const [view, setView] = useState<ChartView>('chart');
  const [tip, setTip] = useState<ColumnTip<Bucket> | null>(null);
  const [filter, setFilter] = useState<State | 'all'>('open');
  const [kind, setKind] = useState<ListingKind | 'all'>('all');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => listings.map((l) => ({ ...l, state: stateOf(l) })), [listings]);
  const counts = useMemo(() => {
    const byState = { open: 0, pending: 0, closed: 0, removed: 0 } as Record<State, number>;
    for (const r of rows) byState[r.state]++;
    return byState;
  }, [rows]);

  const posted = useMemo(() => {
    const grouped = timeBuckets(rows, (r) => r.utcCreatedDateTime, range, new Date(serverNow));
    const buckets: Bucket[] = grouped.buckets.map((b) => {
      const bucket: Bucket = { start: b.start, open: 0, pending: 0, closed: 0, removed: 0 };
      for (const r of b.items) bucket[r.state]++;
      return bucket;
    });
    const added = grouped.buckets.reduce((n, b) => n + b.items.length, 0);
    return { unit: grouped.unit, buckets, added, perUnit: buckets.length ? added / buckets.length : 0 };
  }, [rows, range, serverNow]);
  const rangeLabel = TIME_RANGES.find((r) => r.id === range)!.label;

  const live = rows.filter((r) => r.state !== 'removed');
  const sellers = new Set(live.map((r) => r.sellerId)).size;
  const chats = rows.reduce((n, r) => n + r.chats, 0);
  const asked = rows.filter((r) => r.chats > 0).length;
  const closedValue = totals(rows.filter((r) => r.state === 'closed'));
  const openValue = totals(rows.filter((r) => r.state === 'open' || r.state === 'pending'));

  const byKind = LISTING_KINDS.map((k) => {
    const of = rows.filter((r) => r.kind === k);
    return { kind: k, total: of.length, ...Object.fromEntries(STATES.map((s) => [s.id, of.filter((r) => r.state === s.id).length])) } as {
      kind: ListingKind;
      total: number;
    } & Record<State, number>;
  });

  const needle = search.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (filter === 'all' || r.state === filter) &&
      (kind === 'all' || r.kind === kind) &&
      (!needle || [r.title, r.sellerName, r.pinTitle, r.locationName].some((v) => v?.toLowerCase().includes(needle))),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Total listings" value={rows.length} note="ever posted" />
        {STATES.map((s) => (
          <StatTile key={s.id} label={s.label} value={counts[s.id]} note={`${percent(counts[s.id], rows.length)}, ${s.note}`} swatch={s.color} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Sellers" value={sellers} note="with a listing up" />
        <StatTile label="Close rate" value={percent(counts.closed, live.length)} note="of listings not removed" />
        <StatTile label="Chats" value={chats} note={`about ${asked} ${asked === 1 ? 'listing' : 'listings'} (${percent(asked, rows.length)})`} />
        <StatTile label="Sold value" value={closedValue[0] ?? money(0, 'USD')} note={`${openValue.join(' · ') || money(0, 'USD')} still on offer`} />
      </div>

      <section className="surface space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Listings posted per {posted.unit}</h2>
          <div className="flex flex-wrap items-center gap-3">
            {view === 'chart' ? (
              <ul className="flex flex-wrap gap-3 text-xs text-muted">
                {STATES.map((s) => (
                  <li key={s.id} className="flex items-center gap-1.5">
                    <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
                    {s.label}
                  </li>
                ))}
              </ul>
            ) : null}
            <ViewTabs view={view} onChange={setView} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <RangeTabs range={range} onChange={setRange} />
          <p className="text-sm text-subtle">
            {posted.added.toLocaleString()} posted {range === 'all' ? 'all time' : `in the last ${rangeLabel}`}, {formatRate(posted.perUnit)} per{' '}
            {posted.unit}. Coloured by where each stands now.
          </p>
        </div>
        {view === 'chart' ? (
          <TimeColumns
            buckets={posted.buckets}
            unit={posted.unit}
            series={STATES.map((s) => ({ color: s.color, value: (b: Bucket) => b[s.id] }))}
            describe={(b) => `${STATES.reduce((n, s) => n + b[s.id], 0)} posted (${STATES.map((s) => `${b[s.id]} ${s.label.toLowerCase()}`).join(', ')})`}
            onTip={setTip}
          />
        ) : (
          <div role="tabpanel" className="max-h-72 overflow-y-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="py-1 font-medium capitalize">{posted.unit}</th>
                  <th className="py-1 text-right font-medium">Posted</th>
                  {STATES.map((s) => (
                    <th key={s.id} className="py-1 text-right font-medium">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...posted.buckets].reverse().map((b) => (
                  <tr key={b.start}>
                    <td className="py-1">{periodLabel(posted.unit, b.start)}</td>
                    <td className="py-1 text-right">{STATES.reduce((n, s) => n + b[s.id], 0)}</td>
                    {STATES.map((s) => (
                      <td key={s.id} className="py-1 text-right">
                        {b[s.id]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface overflow-x-auto p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold">By kind</h2>
        <table className="w-full text-left text-sm tabular-nums">
          <thead className="text-subtle">
            <tr>
              <th className="py-1 font-medium">Kind</th>
              <th className="py-1 text-right font-medium">Total</th>
              {STATES.map((s) => (
                <th key={s.id} className="py-1 pl-4 text-right font-medium">
                  {s.label}
                </th>
              ))}
              <th className="py-1 pl-4 text-right font-medium">Close rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {byKind.map((k) => (
              <tr key={k.kind}>
                <td className="py-1">{KIND_LABELS[k.kind]}</td>
                <td className="py-1 text-right">{k.total}</td>
                {STATES.map((s) => (
                  <td key={s.id} className="py-1 pl-4 text-right">
                    {k[s.id]}
                  </td>
                ))}
                <td className="py-1 pl-4 text-right">{percent(k.closed, k.total - k.removed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap rounded-lg border border-line p-0.5" role="group" aria-label="Status">
            {[{ id: 'all' as const, label: 'All' }, ...STATES].map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={filter === s.id}
                onClick={() => setFilter(s.id)}
                className={`btn btn-sm ${filter === s.id ? 'bg-raised text-ink' : 'btn-ghost'}`}
              >
                {s.label} <span className="text-subtle tabular-nums">{s.id === 'all' ? rows.length : counts[s.id]}</span>
              </button>
            ))}
          </div>
          <select aria-label="Kind" value={kind} onChange={(e) => setKind(e.target.value as ListingKind | 'all')} className="field w-auto">
            <option value="all">Every kind</option>
            {LISTING_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <input
            type="search"
            aria-label="Search listings"
            placeholder="Title, seller, pin or place"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field min-w-0 flex-1 sm:max-w-xs"
          />
        </div>

        {shown.length ? (
          <ul className="surface divide-y divide-line">
            {shown.map((r) => {
              const state = STATES.find((s) => s.id === r.state)!;
              const photo = blobUrl(r.photo);
              return (
                <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                  {photo ? (
                    <img src={photo} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span aria-hidden className="size-14 shrink-0 rounded-lg bg-raised" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      {r.state === 'removed' ? (
                        <span className="font-medium text-ink">{r.title}</span>
                      ) : (
                        <Link href={listingHref(r)} className="font-medium">
                          {r.title}
                        </Link>
                      )}
                      <span className="text-sm text-ink tabular-nums">{r.price == null ? '' : r.price ? money(r.price, r.currency) : 'Free'}</span>
                    </div>
                    <div className="text-xs text-subtle">
                      {KIND_LABELS[r.kind].replace(/s$/, '')} by {r.sellerName}
                      {r.pinTitle ? ` · on ${r.pinTitle}` : ' · no pin'}
                      {r.locationName ? ` · ${r.locationName}` : ''}
                    </div>
                    <div className="text-xs text-subtle">
                      Posted {day.format(new Date(r.utcCreatedDateTime))} · updated {day.format(new Date(r.utcDeletedDateTime ?? r.utcUpdatedDateTime))} ·{' '}
                      {r.chats} {r.chats === 1 ? 'chat' : 'chats'}
                      {r.ratings ? ` · ${r.stars}★ from ${r.ratings} ${r.ratings === 1 ? 'rating' : 'ratings'}` : ''}
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-raised px-2 py-0.5 text-xs text-muted">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: state.color }} />
                    {state.label}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="surface px-4 py-6 text-center text-sm text-subtle">No listings match.</p>
        )}
      </section>

      {tip ? (
        <div
          role="tooltip"
          className="floating pointer-events-none fixed z-50 min-w-40 -translate-x-1/2 -translate-y-full px-3 py-2 text-xs"
          style={{ left: tip.x, top: tip.y - 12 }}
        >
          <div className="mb-1 text-subtle">{periodLabel(posted.unit, tip.bucket.start)}</div>
          {STATES.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
              <strong className="text-ink tabular-nums">{tip.bucket[s.id]}</strong>
              <span className="text-muted">{s.label.toLowerCase()}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
