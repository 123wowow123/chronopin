'use client';

import dynamic from 'next/dynamic';
import Link from '@/components/ui/Link';
import { useMemo, useState } from 'react';
import { PinThumb } from '@/components/pin/PinThumb';
import { money } from '@/lib/format';
import { pinPath } from '@/lib/seo';
import { TIME_RANGES, timeBuckets, type TimeRange } from '@/lib/timeStats';
import type { ShopClickRow } from '@/lib/shopping';
import {
  type ChartView,
  type ColumnTip,
  periodLabel,
  RangeTabs,
  SERIES_BLUE,
  SERIES_ORANGE,
  StatTile,
  TimeColumns,
  ViewTabs,
} from '../chartParts';
import type { MapPlace } from '../PlaceMap';

// Leaflet touches window at import, so the map loads in the browser only.
const PlaceMap = dynamic(() => import('../PlaceMap'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg bg-raised" />,
});

type Bucket = { start: string; listing: number; search: number };

const SERIES = [
  { label: 'To a listing', color: SERIES_BLUE, value: (b: Bucket) => b.listing },
  { label: 'To a search', color: SERIES_ORANGE, value: (b: Bucket) => b.search },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT = 50;
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

const who = (c: ShopClickRow) => (c.userId != null ? `u:${c.userId}` : `ip:${c.ip ?? '?'}`);
const countryName = (code: string | null) => {
  if (!code) return 'Unknown';
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};
const placeLabel = (c: ShopClickRow) => [c.city, c.region, c.country].filter(Boolean).join(', ') || (c.ip ? 'Unplaced' : 'No address');
// "2026-09-27 16:05 UTC", the same on the server and in the browser.
const utcTime = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

// Group clicks by a key into rows of clicks and distinct people, most first.
function tally<K extends string>(clicks: ShopClickRow[], keyOf: (c: ShopClickRow) => K) {
  const groups = new Map<K, ShopClickRow[]>();
  for (const c of clicks) {
    const key = keyOf(c);
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups]
    .map(([key, rows]) => ({ key, rows, clicks: rows.length, people: new Set(rows.map(who)).size }))
    .sort((a, b) => b.clicks - a.clicks || b.people - a.people);
}

// Buy button clicks for the chosen range: over time, by store, by place, by
// pin, and the latest ones with who clicked and from where.
export function ClickCharts({ clicks, serverNow }: { clicks: ShopClickRow[]; serverNow: string }) {
  const [range, setRange] = useState<TimeRange>('30d');
  const [tip, setTip] = useState<ColumnTip<Bucket> | null>(null);
  const [view, setView] = useState<ChartView>('chart');
  const now = useMemo(() => new Date(serverNow), [serverNow]);
  const rangeLabel = TIME_RANGES.find((r) => r.id === range)!.label;
  const inRange = range === 'all' ? 'all time' : `in the last ${rangeLabel}`;

  const stats = useMemo(() => {
    const grouped = timeBuckets(clicks, (c) => c.at, range, now);
    const since = range === 'all' ? -Infinity : new Date(grouped.buckets[0]?.start ?? now).getTime();
    const shown = clicks.filter((c) => new Date(c.at).getTime() >= since);
    const buckets: Bucket[] = grouped.buckets.map((b) => ({
      start: b.start,
      listing: b.items.filter((c) => !c.search).length,
      search: b.items.filter((c) => c.search).length,
    }));
    const places: MapPlace[] = tally(
      shown.filter((c) => c.latitude != null && c.longitude != null),
      (c) => `${c.latitude!.toFixed(1)},${c.longitude!.toFixed(1)}`,
    ).map((g) => ({ key: g.key, label: placeLabel(g.rows[0]), latitude: g.rows[0].latitude!, longitude: g.rows[0].longitude!, count: g.clicks }));
    return {
      unit: grouped.unit,
      buckets,
      shown,
      people: new Set(shown.map(who)).size,
      signedIn: shown.filter((c) => c.userId != null).length,
      listing: shown.filter((c) => !c.search).length,
      stores: tally(shown, (c) => c.store),
      countries: tally(shown, (c) => c.country ?? ''),
      cities: tally(
        shown.filter((c) => c.city),
        (c) => placeLabel(c),
      ).slice(0, 15),
      pins: tally(shown, (c) => String(c.pinId)).slice(0, 15),
      places,
    };
  }, [clicks, range, now]);

  const total = stats.shown.length;
  const days = TIME_RANGES.find((r) => r.id === range)!.days ?? Math.max(1, Math.ceil((now.getTime() - new Date(clicks.at(-1)?.at ?? now).getTime()) / DAY_MS));
  const percent = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : '0%');

  return (
    <div className="mb-8 space-y-4">
      <RangeTabs range={range} onChange={setRange} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Clicks" value={total} note={`${inRange}, ${percent(stats.signedIn)} signed in`} />
        <StatTile label="People" value={stats.people} note="signed-in users, and guests by address" />
        <StatTile label="To a listing" value={percent(stats.listing)} note={`the rest to a search · ${(total / days).toFixed(1)} a day`} />
      </div>

      <section className="surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Clicks per {stats.unit}</h2>
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
            describe={(b) => `${b.listing + b.search} clicks (${b.listing} to a listing, ${b.search} to a search)`}
            onTip={setTip}
          />
        ) : (
          <div role="tabpanel" className="max-h-72 overflow-y-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="py-1 font-medium capitalize">{stats.unit}</th>
                  <th className="py-1 text-right font-medium">Clicks</th>
                  <th className="py-1 text-right font-medium">Listing</th>
                  <th className="py-1 text-right font-medium">Search</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...stats.buckets].reverse().map((b) => (
                  <tr key={b.start}>
                    <td className="py-1">{periodLabel(stats.unit, b.start)}</td>
                    <td className="py-1 text-right">{b.listing + b.search}</td>
                    <td className="py-1 text-right">{b.listing}</td>
                    <td className="py-1 text-right">{b.search}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold">By store</h2>
        {stats.stores.length ? (
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="w-full py-1 font-medium">Store</th>
                  <th className="py-1 pl-6 text-right font-medium">Clicks</th>
                  <th className="py-1 pl-6 text-right font-medium">Listing</th>
                  <th className="py-1 pl-6 text-right font-medium">Search</th>
                  <th className="py-1 pl-6 text-right font-medium">People</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.stores.map((s) => (
                  <tr key={s.key}>
                    <td className="py-1.5">{s.key}</td>
                    <td className="py-1.5 pl-6 text-right">{s.clicks}</td>
                    <td className="py-1.5 pl-6 text-right">{s.rows.filter((c) => !c.search).length}</td>
                    <td className="py-1.5 pl-6 text-right">{s.rows.filter((c) => c.search).length}</td>
                    <td className="py-1.5 pl-6 text-right">{s.people}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-subtle">No buy clicks {inRange}.</p>
        )}
      </section>

      <section className="surface space-y-4 p-4 sm:p-5">
        <h2 className="text-base font-semibold">Where from</h2>
        {stats.places.length ? <PlaceMap places={stats.places} noun="click" /> : null}
        {stats.countries.length ? (
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="w-full py-1 font-medium">Country</th>
                  <th className="py-1 pl-4 text-right font-medium">Clicks</th>
                  <th className="py-1 pl-4 text-right font-medium">People</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.countries.map((c) => (
                  <tr key={c.key}>
                    <td className="py-1.5">{countryName(c.key || null)}</td>
                    <td className="py-1.5 pl-4 text-right">{c.clicks}</td>
                    <td className="py-1.5 pl-4 text-right">{c.people}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="w-full py-1 font-medium">City</th>
                  <th className="py-1 pl-4 text-right font-medium">Clicks</th>
                  <th className="py-1 pl-4 text-right font-medium">People</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.cities.map((c) => (
                  <tr key={c.key}>
                    <td className="max-w-0 truncate py-1.5" title={c.key}>
                      {c.key}
                    </td>
                    <td className="py-1.5 pl-4 text-right">{c.clicks}</td>
                    <td className="py-1.5 pl-4 text-right">{c.people}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-subtle">No buy clicks {inRange}.</p>
        )}
        <p className="text-xs text-faint">
          <a href="https://db-ip.com" className="text-inherit">
            IP Geolocation by DB-IP
          </a>
        </p>
      </section>

      <section className="surface p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold">Most clicked pins</h2>
        {stats.pins.length ? (
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="w-full py-1 font-medium">Pin</th>
                  <th className="py-1 pl-6 text-right font-medium">Clicks</th>
                  <th className="py-1 pl-6 text-right font-medium">People</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.pins.map(({ key, rows, clicks, people }) => {
                  const pin = rows[0];
                  return (
                    <tr key={key}>
                      <td className="w-full max-w-0 py-1.5">
                        <Link href={pinPath({ id: pin.pinId, title: pin.title ?? '' })} title={pin.title ?? ''} className="flex items-center gap-3 text-link">
                          <PinThumb thumbName={pin.thumbName} originalUrl={pin.originalUrl} />
                          <span className="truncate">{pin.title || `Pin ${pin.pinId}`}</span>
                        </Link>
                      </td>
                      <td className="py-1.5 pl-6 text-right">{clicks}</td>
                      <td className="py-1.5 pl-6 text-right">{people}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-subtle">No buy clicks {inRange}.</p>
        )}
      </section>

      <section className="surface p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold">Latest clicks</h2>
        {total ? (
          <ul className="divide-y divide-line text-sm">
            {stats.shown.slice(0, RECENT).map((c) => (
              <li key={c.id} className="py-2">
                <div className="flex items-baseline gap-3">
                  <Link href={pinPath({ id: c.pinId, title: c.title ?? '' })} title={c.title ?? ''} className="min-w-0 flex-1 truncate text-link">
                    {c.title || `Pin ${c.pinId}`}
                  </Link>
                  <span className="shrink-0 whitespace-nowrap">
                    {c.store}
                    <span className="text-subtle">{c.search ? ' · search' : c.price ? ` · ${money(c.price, c.currency)}` : ' · listing'}</span>
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-subtle tabular-nums">
                  <span className="text-ink">{c.userId != null ? (c.userName ?? `user ${c.userId}`) : (c.ip ?? 'unknown address')}</span>
                  <span>{placeLabel(c)}</span>
                  <span className="ml-auto">{utcTime(c.at)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-subtle">No buy clicks {inRange}.</p>
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
