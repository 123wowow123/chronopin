'use client';

import dynamic from 'next/dynamic';
import Link from '@/components/ui/Link';
import { useMemo, useState } from 'react';
import { PinThumb } from '@/components/pin/PinThumb';
import { isLocale, LOCALE_NAMES } from '@/lib/i18n/config';
import { pinPath } from '@/lib/seo';
import { TIME_RANGES, type TimeRange } from '@/lib/timeStats';
import { type ViewBucket, type ViewDay, viewStats } from '@/lib/viewStats';
import {
  type ChartView,
  type ColumnTip,
  formatRate,
  OpenPlacesButton,
  periodLabel,
  PlaceRows,
  RangeTabs,
  SERIES_BLUE,
  SERIES_ORANGE,
  StatTile,
  TimeColumns,
  useOpenRows,
  ViewTabs,
} from '../chartParts';
import type { MapPlace } from '../PlaceMap';

// Leaflet touches window at import, so the map loads in the browser only.
const PlaceMap = dynamic(() => import('../PlaceMap'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg bg-raised" />,
});

export type RangeSummary = {
  viewers: number;
  top: {
    id: number;
    title: string;
    views: number;
    viewers: number;
    // Distinct signed-in users among the viewers.
    users: number;
    thumbName?: string | null;
    originalUrl?: string | null;
    // Where this pin's views came from ("" unplaced, null no address).
    places: { place: string | null; views: number; viewers: number; users: number }[];
  }[];
  // Views with an address, and where those came from ("" is unplaced).
  located: number;
  countries: { country: string; views: number; viewers: number }[];
  cities: { city: string; views: number; viewers: number }[];
  points: { label: string; latitude: number; longitude: number; views: number }[];
  // Every view, by the language it was read in ("" is before languages were recorded).
  languages: { locale: string; views: number; viewers: number; users: number }[];
};

export type LatestView = {
  pinId: number;
  title: string | null;
  at: string;
  userId: number | null;
  userName: string | null;
  ip: string;
  place: string;
};

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = (code: string) => {
  if (!code) return 'Unplaced';
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};
const languageName = (locale: string) => (isLocale(locale) ? `${LOCALE_NAMES[locale]} (${locale})` : 'Unknown');
// "2026-09-27 16:05 UTC", the same on the server and in the browser.
const utcTime = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

const SERIES = [
  { label: 'Signed in', color: SERIES_BLUE, value: (b: ViewBucket) => b.signedIn },
  { label: 'Guests', color: SERIES_ORANGE, value: (b: ViewBucket) => b.guests },
];

// Pin page views over time, the most-viewed pins and where the views came
// from for the chosen range, and the latest views with who and from where.
export function ViewCharts({
  days,
  latest,
  summaries,
  serverNow,
}: {
  days: ViewDay[];
  latest: LatestView[];
  summaries: Record<TimeRange, RangeSummary>;
  // When the server rendered, so the buckets match during hydration.
  serverNow: string;
}) {
  const [range, setRange] = useState<TimeRange>('30d');
  const [tip, setTip] = useState<ColumnTip<ViewBucket> | null>(null);
  const [view, setView] = useState<ChartView>('chart');
  const [openPins, togglePin] = useOpenRows();
  const stats = useMemo(() => viewStats(days, range, new Date(serverNow)), [days, range, serverNow]);
  const summary = summaries[range];
  const rangeLabel = TIME_RANGES.find((r) => r.id === range)!.label;
  const inRange = range === 'all' ? 'all time' : `in the last ${rangeLabel}`;
  const places = useMemo<MapPlace[]>(
    () => summary.points.map((p) => ({ key: `${p.latitude},${p.longitude}`, label: p.label, latitude: p.latitude, longitude: p.longitude, count: p.views })),
    [summary],
  );

  return (
    <div className="mb-8 space-y-4">
      <RangeTabs range={range} onChange={setRange} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Views"
          info="Pin page visits in the selected range. A viewer is counted once per pin per UTC day, so reloading or reopening the same pin that day adds nothing. Crawlers, card impressions and outbound clicks are not counted. The percentage is the share of views made by signed-in users; the rest are guests."
          value={stats.views}
          note={`${inRange}, ${stats.views ? Math.round((stats.signedIn / stats.views) * 100) : 0}% signed in`}
        />
        <StatTile
          label="Unique viewers"
          info="How many different people (signed-in users or guest browsers) viewed at least one pin in the selected range. Someone who views ten pins, or comes back on several days, counts once here but adds to Views each time."
          value={summary.viewers}
          note={inRange}
        />
        <StatTile
          label="View rate"
          info={`The average number of views per ${stats.unit} across the selected range: total views divided by the number of ${stats.unit}s charted below.`}
          value={formatRate(stats.perUnit)}
          note={`per ${stats.unit}`}
        />
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
            <table className="w-full text-left tabular-nums [&>tbody+tbody]:border-t [&>tbody+tbody]:border-line">
              <thead className="text-subtle">
                <tr>
                  <th className="w-full py-1 font-medium">Pin</th>
                  <th className="py-1 pl-6 text-right font-medium whitespace-nowrap" title="One per viewer per UTC day">
                    Views
                  </th>
                  <th className="py-1 pl-6 text-right font-medium whitespace-nowrap" title="Distinct people, signed in or not">
                    Viewers
                  </th>
                  <th className="py-1 pl-6 text-right font-medium whitespace-nowrap" title="Distinct signed-in users">
                    Signed in
                  </th>
                </tr>
              </thead>
              {summary.top.map((p) => {
                const open = openPins.has(String(p.id));
                return (
                  <tbody key={p.id}>
                    <tr>
                      <td className="w-full max-w-0 py-1.5">
                        <div className="flex items-center gap-2">
                          <OpenPlacesButton open={open} onClick={() => togglePin(String(p.id))} />
                          <Link href={pinPath(p)} title={p.title} className="flex min-w-0 items-center gap-3 text-link">
                            <PinThumb thumbName={p.thumbName} originalUrl={p.originalUrl} title={p.title} />
                            <span className="truncate">{p.title || `Pin ${p.id}`}</span>
                          </Link>
                        </div>
                      </td>
                      <td className="py-1.5 pl-6 text-right">{p.views}</td>
                      <td className="py-1.5 pl-6 text-right">{p.viewers}</td>
                      <td className="py-1.5 pl-6 text-right">{p.users}</td>
                    </tr>
                    {open ? (
                      <PlaceRows
                        places={p.places.map((c) => ({
                          place: c.place === null ? 'No address' : c.place || 'Unplaced',
                          count: c.views,
                          people: c.viewers,
                          signedIn: c.users,
                          faint: !c.place,
                        }))}
                      />
                    ) : null}
                  </tbody>
                );
              })}
            </table>
          </div>
        ) : (
          <p className="text-sm text-subtle">No pin views {inRange}.</p>
        )}
      </section>

      <section className="surface p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold">Languages</h2>
        {summary.languages.length ? (
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="w-full py-1 font-medium">Language</th>
                  <th className="py-1 pl-4 text-right font-medium">Views</th>
                  <th className="py-1 pl-4 text-right font-medium">Share</th>
                  <th className="py-1 pl-4 text-right font-medium">Viewers</th>
                  <th className="py-1 pl-4 text-right font-medium whitespace-nowrap">Signed in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.languages.map((l) => (
                  <tr key={l.locale} className={l.locale ? undefined : 'text-subtle'}>
                    <td className="py-1.5">{languageName(l.locale)}</td>
                    <td className="py-1.5 pl-4 text-right">{l.views}</td>
                    <td className="py-1.5 pl-4 text-right">{stats.views ? Math.round((l.views / stats.views) * 100) : 0}%</td>
                    <td className="py-1.5 pl-4 text-right">{l.viewers}</td>
                    <td className="py-1.5 pl-4 text-right">{l.users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-subtle">No pin views {inRange}.</p>
        )}
        <p className="mt-3 text-xs text-faint">
          The language of the page the view was on. Views before 1 October 2026 did not record one.
        </p>
      </section>

      <section className="surface space-y-4 p-4 sm:p-5">
        <h2 className="text-base font-semibold">Where from</h2>
        {places.length ? <PlaceMap places={places} noun="view" /> : null}
        {summary.countries.length ? (
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="w-full py-1 font-medium">Country</th>
                  <th className="py-1 pl-4 text-right font-medium">Views</th>
                  <th className="py-1 pl-4 text-right font-medium">Viewers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.countries.map((c) => (
                  <tr key={c.country}>
                    <td className="py-1.5">{countryName(c.country)}</td>
                    <td className="py-1.5 pl-4 text-right">{c.views}</td>
                    <td className="py-1.5 pl-4 text-right">{c.viewers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="w-full py-1 font-medium">City</th>
                  <th className="py-1 pl-4 text-right font-medium">Views</th>
                  <th className="py-1 pl-4 text-right font-medium">Viewers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.cities.map((c) => (
                  <tr key={c.city}>
                    <td className="max-w-0 truncate py-1.5" title={c.city}>
                      {c.city}
                    </td>
                    <td className="py-1.5 pl-4 text-right">{c.views}</td>
                    <td className="py-1.5 pl-4 text-right">{c.viewers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-subtle">No views with an address {inRange}.</p>
        )}
        <p className="text-xs text-faint">
          {stats.views ? `${Math.round((summary.located / stats.views) * 100)}% of views ${inRange} have an address. ` : null}
          <a href="https://db-ip.com" className="text-inherit">
            IP Geolocation by DB-IP
          </a>
        </p>
      </section>

      <section className="surface p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold">Latest views</h2>
        {latest.length ? (
          <ul className="divide-y divide-line text-sm">
            {latest.map((v) => (
              <li key={`${v.pinId}-${v.userId ?? v.ip}-${v.at}`} className="py-2">
                <Link href={pinPath({ id: v.pinId, title: v.title ?? '' })} title={v.title ?? ''} className="block truncate text-link">
                  {v.title || `Pin ${v.pinId}`}
                </Link>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-subtle tabular-nums">
                  <span className="text-ink">{v.userId != null ? (v.userName ?? `user ${v.userId}`) : v.ip}</span>
                  {v.userId != null ? <span>{v.ip}</span> : null}
                  <span>{v.place || 'Unplaced'}</span>
                  <span className="ml-auto">{utcTime(v.at)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-subtle">No views with an address yet.</p>
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
