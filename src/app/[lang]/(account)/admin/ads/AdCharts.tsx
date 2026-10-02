'use client';

import dynamic from 'next/dynamic';
import Link from '@/components/ui/Link';
import { Fragment, useMemo, useState } from 'react';
import { PinThumb } from '@/components/pin/PinThumb';
import { LOCALES } from '@/lib/i18n/config';
import en from '@/lib/i18n/messages/en';
import { pinPath } from '@/lib/seo';
import { TIME_RANGES, timeBuckets, type TimeRange } from '@/lib/timeStats';
import type { AdPlacementsSetting } from '@/lib/adPlacements';
import { AD_SLOTS, type AdClickRow, type AdImpressionRow, type AdKind } from '@/lib/ads';
import { SLOT_LABEL } from './slots';
import { type ChartView, type ColumnTip, periodLabel, RangeTabs, SERIES_BLUE, SERIES_ORANGE, StatTile, TimeColumns, ViewTabs } from '../chartParts';
import type { MapPlace } from '../PlaceMap';

const PlaceMap = dynamic(() => import('../PlaceMap'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg bg-raised" />,
});

type Label = { kind: AdKind; program: string | null; title: string | null; pinId: number | null };
type Bucket = { start: string; programs: number; products: number; shown: number };

const SERIES = [
  { label: 'Program ads', color: SERIES_BLUE, value: (b: Bucket) => b.programs },
  { label: 'Product ads', color: SERIES_ORANGE, value: (b: Bucket) => b.products },
];

const KIND_LABEL: Record<AdKind, string> = { special: 'Special program', bonus: 'Bonus event', tradein: 'Trade-In', product: 'Product' };
const RECENT = 50;
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = (code: string | null) => {
  if (!code) return 'Unknown';
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};
const placeLabel = (c: AdClickRow) => [c.city, c.region, c.country].filter(Boolean).join(', ') || (c.ip ? 'Unplaced' : 'No address');
const utcTime = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
const who = (c: AdClickRow) => (c.userId != null ? `u:${c.userId}` : `ip:${c.ip ?? '?'}`);
const programName = (program: string | null) =>
  program ? ((en.ads.programs as Record<string, { title: string }>)[program]?.title ?? program) : null;
const rate = (clicks: number, shown: number) => (shown ? `${((clicks / shown) * 100).toFixed(1)}%` : '–');

type Cell = { shown: number; clicks: number; people: number };
type Row = Cell & { key: string; signedIn: Cell; guests: Cell };

// Shown and clicked per key, most clicked first, then most shown, with each
// row's totals also split between signed-in users and guests.
function rows(impressions: AdImpressionRow[], clicks: AdClickRow[], keyOfImpression: (i: AdImpressionRow) => string, keyOfClick: (c: AdClickRow) => string): Row[] {
  type Acc = { shown: number; clicks: number; people: Set<string> };
  const blank = (): Acc => ({ shown: 0, clicks: 0, people: new Set() });
  const out = new Map<string, { all: Acc; signedIn: Acc; guests: Acc }>();
  const at = (key: string) => out.get(key) ?? out.set(key, { all: blank(), signedIn: blank(), guests: blank() }).get(key)!;
  for (const i of impressions) {
    const row = at(keyOfImpression(i));
    row.all.shown += i.count;
    (i.signedIn ? row.signedIn : row.guests).shown += i.count;
  }
  for (const c of clicks) {
    const row = at(keyOfClick(c));
    for (const part of [row.all, c.userId != null ? row.signedIn : row.guests]) {
      part.clicks += 1;
      part.people.add(who(c));
    }
  }
  const cell = (a: Acc): Cell => ({ shown: a.shown, clicks: a.clicks, people: a.people.size });
  return [...out]
    .map(([key, r]) => ({ key, ...cell(r.all), signedIn: cell(r.signedIn), guests: cell(r.guests) }))
    .sort((a, b) => b.clicks - a.clicks || b.shown - a.shown);
}

// Where each placement is on screen: only in the phone layout, only in the
// desktop one, or in both (a pin's ads and the timeline's rows just show fewer
// on a phone). A placement added later and not listed falls under Both.
const MOBILE_ONLY: readonly string[] = ['drawer'];
const DESKTOP_ONLY: readonly string[] = ['timeline-side'];
const PLACEMENT_GROUPS = [
  { label: 'Mobile', note: 'Phone layout only', has: (key: string) => MOBILE_ONLY.includes(key) },
  { label: 'Desktop', note: 'Wide screens only', has: (key: string) => DESKTOP_ONLY.includes(key) },
  { label: 'Both', note: 'Phone and desktop', has: (key: string) => !MOBILE_ONLY.includes(key) && !DESKTOP_ONLY.includes(key) },
];

// A disabled placement shows no ads, so it may have no rows of its own; list
// every placement anyway, so one that is off reads as off, not missing.
function withEveryPlacement(slots: Row[]): Row[] {
  const none: Cell = { shown: 0, clicks: 0, people: 0 };
  const have = new Set(slots.map((r) => r.key));
  const missing = AD_SLOTS.filter((key) => !have.has(key)).map((key) => ({ key, ...none, signedIn: none, guests: none }));
  return [...slots, ...missing];
}

// Clicks and people by one key, for places and pages (they have no "shown").
function PlaceTable({ title, rows, name }: { title: string; rows: Row[]; name: (key: string) => React.ReactNode }) {
  return (
    <table className="w-full text-left text-sm tabular-nums">
      <thead className="text-subtle">
        <tr>
          <th className="w-full py-1 font-medium">{title}</th>
          <th className="py-1 pl-4 text-right font-medium">Clicks</th>
          <th className="py-1 pl-4 text-right font-medium">People</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((r) => (
          <tr key={r.key}>
            <td className="max-w-0 truncate py-1.5">{name(r.key)}</td>
            <td className="py-1.5 pl-4 text-right">{r.clicks}</td>
            <td className="py-1.5 pl-4 text-right">{r.people}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// groups: rows under a heading each, in this order; a group with no rows is left out.
function StatTable({
  title,
  rows,
  name,
  empty,
  split = true,
  groups,
  bare = false,
}: {
  title: string;
  rows: Row[];
  name: (key: string) => React.ReactNode;
  empty: string;
  split?: boolean;
  // Inside another card: no card of its own, a smaller heading.
  bare?: boolean;
  groups?: { label: string; note?: string; has: (key: string) => boolean }[];
}) {
  const sections = groups ? groups.map((g) => ({ label: g.label, note: g.note, rows: rows.filter((r) => g.has(r.key)) })).filter((g) => g.rows.length) : [{ label: '', note: undefined, rows }];
  return (
    <section className={bare ? '' : 'surface p-4 sm:p-5'}>
      {bare ? title ? <h3 className="mb-1 text-sm font-semibold text-muted">{title}</h3> : null : <h2 className="mb-3 text-base font-semibold">{title}</h2>}
      {rows.length ? (
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left tabular-nums">
            <thead className="text-subtle">
              <tr>
                <th className="w-full py-1 font-medium" />
                <th className="py-1 pl-6 text-right font-medium">Shown</th>
                <th className="py-1 pl-6 text-right font-medium">Clicks</th>
                <th className="py-1 pl-6 text-right font-medium">CTR</th>
                <th className="py-1 pl-6 text-right font-medium">People</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sections.map((section, index) => (
                <Fragment key={section.label}>
                  {section.label ? (
                    <>
                      {index ? (
                        <tr aria-hidden>
                          <td colSpan={5} className="h-5 p-0" />
                        </tr>
                      ) : null}
                      <tr className="border-t-0">
                        <th colSpan={5} className="rounded-lg bg-raised px-3 py-2 text-left font-semibold text-ink">
                          {section.label}
                          {section.note ? <span className="ml-2 text-xs font-normal text-subtle">{section.note}</span> : null}
                        </th>
                      </tr>
                    </>
                  ) : null}
                  {section.rows.map((r) => (
                    <Fragment key={r.key}>
                    <tr>
                      <td className="max-w-0 py-1.5">{name(r.key)}</td>
                      <td className="py-1.5 pl-6 text-right">{r.shown}</td>
                      <td className="py-1.5 pl-6 text-right">{r.clicks}</td>
                      <td className="py-1.5 pl-6 text-right">{rate(r.clicks, r.shown)}</td>
                      <td className="py-1.5 pl-6 text-right">{r.people}</td>
                    </tr>
                    {split
                      ? ([['Signed in', r.signedIn], ['Guests', r.guests]] as const).map(([label, c]) => (
                          <tr key={label} className="text-xs text-subtle">
                            <td className="py-0.5 pl-4">{label}</td>
                            <td className="py-0.5 pl-6 text-right">{c.shown}</td>
                            <td className="py-0.5 pl-6 text-right">{c.clicks}</td>
                            <td className="py-0.5 pl-6 text-right">{rate(c.clicks, c.shown)}</td>
                            <td className="py-0.5 pl-6 text-right">{c.people}</td>
                          </tr>
                        ))
                      : null}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-subtle">{empty}</p>
      )}
    </section>
  );
}

const LOCALE_PREFIX = new RegExp(`^/(${LOCALES.join('|')})(?=/|$|\\?)`);
// The page a click was on without its language ("/en/pin/12/x" -> "/pin/12/x").
const pagePath = (c: AdClickRow) => (c.page ? c.page.replace(LOCALE_PREFIX, '') || '/' : '');
// Which part of the site a page is.
function siteSection(path: string): string {
  if (!path) return 'Not recorded';
  const bare = path.split('?')[0];
  if (bare === '/' || bare === '') return 'Timeline';
  const first = bare.split('/')[1];
  const sections: Record<string, string> = { pin: 'Pin page', search: 'Search', tag: 'Tag page', company: 'Company page', map: 'Map', user: 'Profile' };
  return sections[first] ?? `/${first}`;
}
// A page path for reading; a malformed escape stays as it was.
const readable = (path: string) => {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};
const regionOf = (c: AdClickRow) => (c.region || c.country ? [c.region, c.country].filter(Boolean).join(', ') : '');
const cityOf = (c: AdClickRow) => (c.city ? [c.city, c.region, c.country].filter(Boolean).join(', ') : '');

type Clicker = { key: string; latest: AdClickRow; clicks: number; ads: number; ips: number };

// Clicks by who made them: a signed-in user by id (across every address they
// clicked from), a guest by address. Most clicks first.
function clickers(clicks: AdClickRow[]): Clicker[] {
  const groups = new Map<string, AdClickRow[]>();
  for (const c of clicks) groups.set(who(c), [...(groups.get(who(c)) ?? []), c]);
  return [...groups]
    .map(([key, list]) => ({
      key,
      latest: list[0],
      clicks: list.length,
      ads: new Set(list.map((c) => c.adKey)).size,
      ips: new Set(list.map((c) => c.ip ?? '')).size,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.latest.at.localeCompare(a.latest.at));
}

// Ads shown and clicked for the chosen range: over time, by kind, slot, store
// and ad, where the clicks came from, and the latest ones.
export function AdCharts({
  clicks,
  impressions,
  labels,
  serverNow,
  placements,
}: {
  clicks: AdClickRow[];
  impressions: AdImpressionRow[];
  labels: Record<string, Label>;
  serverNow: string;
  placements: AdPlacementsSetting;
}) {
  const [range, setRange] = useState<TimeRange>('30d');
  const [tip, setTip] = useState<ColumnTip<Bucket> | null>(null);
  const [view, setView] = useState<ChartView>('chart');
  const now = useMemo(() => new Date(serverNow), [serverNow]);
  const rangeLabel = TIME_RANGES.find((r) => r.id === range)!.label;
  const inRange = range === 'all' ? 'all time' : `in the last ${rangeLabel}`;
  const empty = `No ads shown ${inRange}.`;

  const stats = useMemo(() => {
    // Clicks and impressions in the same buckets, so their columns line up
    // whatever the range starts from.
    const events = [
      ...clicks.map((click) => ({ at: click.at, click, impression: null })),
      ...impressions.map((impression) => ({ at: `${impression.day}T12:00:00Z`, click: null, impression })),
    ];
    const grouped = timeBuckets(events, (e) => e.at, range, now);
    const since = range === 'all' ? -Infinity : new Date(grouped.buckets[0]?.start ?? now).getTime();
    const sinceDay = range === 'all' ? '' : new Date(since).toISOString().slice(0, 10);
    const shownClicks = clicks.filter((c) => new Date(c.at).getTime() >= since);
    const shownImpressions = impressions.filter((i) => i.day >= sinceDay);
    const buckets: Bucket[] = grouped.buckets.map((b) => {
      const bucketClicks = b.items.flatMap((e) => (e.click ? [e.click] : []));
      return {
        start: b.start,
        programs: bucketClicks.filter((c) => c.kind !== 'product').length,
        products: bucketClicks.filter((c) => c.kind === 'product').length,
        shown: b.items.reduce((sum, e) => sum + (e.impression?.count ?? 0), 0),
      };
    });
    const places = new Map<string, MapPlace>();
    for (const c of shownClicks) {
      if (c.latitude == null || c.longitude == null) continue;
      const key = `${c.latitude.toFixed(1)},${c.longitude.toFixed(1)}`;
      const place = places.get(key) ?? { key, label: placeLabel(c), latitude: c.latitude, longitude: c.longitude, count: 0 };
      place.count += 1;
      places.set(key, place);
    }
    return {
      unit: grouped.unit,
      buckets,
      clicks: shownClicks,
      shown: shownImpressions.reduce((sum, i) => sum + i.count, 0),
      people: new Set(shownClicks.map(who)).size,
      kinds: rows(shownImpressions, shownClicks, (i) => i.kind, (c) => c.kind),
      slots: rows(shownImpressions, shownClicks, (i) => i.slot, (c) => c.slot),
      viewers: rows(shownImpressions, shownClicks, (i) => (i.signedIn ? 'in' : 'guest'), (c) => (c.userId != null ? 'in' : 'guest')),
      stores: rows(shownImpressions, shownClicks, (i) => i.store, (c) => c.store),
      abroad: rows(
        shownImpressions.filter((i) => i.store !== 'US'),
        shownClicks.filter((c) => c.store !== 'US'),
        (i) => i.kind,
        (c) => c.kind,
      ),
      tags: rows(shownImpressions, shownClicks, (i) => `${i.store}|${i.tag}`, (c) => `${c.store}|${c.tag ?? ''}`).map((total) => {
        const ims = shownImpressions.filter((i) => `${i.store}|${i.tag}` === total.key);
        const cs = shownClicks.filter((c) => `${c.store}|${c.tag ?? ''}` === total.key);
        return {
          total,
          slots: rows(ims, cs, (i) => i.slot, (c) => c.slot),
          kinds: rows(ims, cs, (i) => i.kind, (c) => c.kind),
          ads: rows(ims, cs, (i) => i.adKey, (c) => c.adKey).slice(0, 8),
        };
      }),
      ads: rows(shownImpressions, shownClicks, (i) => i.adKey, (c) => c.adKey).slice(0, 25),
      countries: rows([], shownClicks, () => '', (c) => c.country ?? ''),
      clickers: clickers(shownClicks),
      regions: rows([], shownClicks.filter(regionOf), () => '', regionOf).slice(0, 20),
      cities: rows([], shownClicks.filter(cityOf), () => '', cityOf).slice(0, 20),
      sections: rows([], shownClicks, () => '', (c) => siteSection(pagePath(c))),
      pages: rows([], shownClicks.filter((c) => c.page), () => '', pagePath).slice(0, 25),
      places: [...places.values()],
    };
  }, [clicks, impressions, range, now]);

  const total = stats.clicks.length;
  const adName = (key: string) => {
    const label = labels[key];
    const name = programName(label?.program ?? null) ?? label?.title ?? key;
    const kind = label ? KIND_LABEL[label.kind] : '';
    return (
      <span className="flex min-w-0 items-baseline gap-2">
        {label?.pinId ? (
          <Link href={pinPath({ id: label.pinId, title: label.title ?? '' })} className="truncate text-link" title={name}>
            {name}
          </Link>
        ) : (
          <span className="truncate" title={name}>
            {name}
          </span>
        )}
        <span className="shrink-0 text-xs text-subtle">{kind}</span>
      </span>
    );
  };

  return (
    <div className="mb-8 space-y-4">
      <RangeTabs range={range} onChange={setRange} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Shown" value={stats.shown} note={`ads served ${inRange}`} />
        <StatTile label="Clicks" value={total} note={`by ${stats.people} people`} />
        <StatTile label="Click-through" value={rate(total, stats.shown)} note="clicks per ad shown" />
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
            describe={(b) => `${b.programs + b.products} clicks (${b.programs} on program ads, ${b.products} on product ads), ${b.shown} shown`}
            onTip={setTip}
          />
        ) : (
          <div role="tabpanel" className="max-h-72 overflow-y-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="py-1 font-medium capitalize">{stats.unit}</th>
                  <th className="py-1 text-right font-medium">Shown</th>
                  <th className="py-1 text-right font-medium">Clicks</th>
                  <th className="py-1 text-right font-medium">Program</th>
                  <th className="py-1 text-right font-medium">Product</th>
                  <th className="py-1 text-right font-medium">CTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...stats.buckets].reverse().map((b) => (
                  <tr key={b.start}>
                    <td className="py-1">{periodLabel(stats.unit, b.start)}</td>
                    <td className="py-1 text-right">{b.shown}</td>
                    <td className="py-1 text-right">{b.programs + b.products}</td>
                    <td className="py-1 text-right">{b.programs}</td>
                    <td className="py-1 text-right">{b.products}</td>
                    <td className="py-1 text-right">{rate(b.programs + b.products, b.shown)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <StatTable title="By kind" rows={stats.kinds} name={(key) => KIND_LABEL[key as AdKind] ?? key} empty={empty} />
        <StatTable
          title="By placement"
          rows={withEveryPlacement(stats.slots)}
          groups={PLACEMENT_GROUPS}
          name={(key) => (
            <>
              {SLOT_LABEL[key as keyof typeof SLOT_LABEL] ?? key}
              {key in placements && !placements[key as keyof AdPlacementsSetting] ? (
                <span className="ml-2 rounded bg-raised px-1.5 py-0.5 text-xs text-subtle">Disabled</span>
              ) : null}
            </>
          )}
          empty={empty}
        />
      </div>

      <StatTable
        title="Signed-in users and guests"
        rows={stats.viewers}
        name={(key) => (key === 'in' ? 'Signed-in users' : 'Guests')}
        empty={empty}
        split={false}
      />
      <p className="-mt-2 text-xs text-faint">Ads shown before signed-in views were counted separately (0113) are counted as guests.</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-4 sm:p-5">
          <h2 className="mb-3 text-base font-semibold">Where on the site</h2>
          {stats.sections.length ? (
            <PlaceTable title="Section" rows={stats.sections} name={(key) => key} />
          ) : (
            <p className="text-sm text-subtle">No ad clicks {inRange}.</p>
          )}
        </section>
        <section className="surface p-4 sm:p-5">
          <h2 className="mb-3 text-base font-semibold">Top pages</h2>
          {stats.pages.length ? (
            <PlaceTable
              title="Page"
              rows={stats.pages}
              name={(key) => (
                <a href={key} className="text-link" title={key}>
                  {readable(key)}
                </a>
              )}
            />
          ) : (
            <p className="text-sm text-subtle">No ad clicks {inRange}.</p>
          )}
        </section>
      </div>

      <StatTable title="Top ads" rows={stats.ads} name={adName} empty={empty} />

      <section className="surface p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold">Who clicked</h2>
        {stats.clickers.length ? (
          <div className="max-h-96 overflow-auto text-sm">
            <table className="w-full text-left tabular-nums">
              <thead className="text-subtle">
                <tr>
                  <th className="w-full py-1 font-medium">User or address</th>
                  <th className="py-1 pl-6 font-medium whitespace-nowrap">Place</th>
                  <th className="py-1 pl-6 text-right font-medium">Clicks</th>
                  <th className="py-1 pl-6 text-right font-medium">Ads</th>
                  <th className="py-1 pl-6 text-right font-medium whitespace-nowrap">Last click</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.clickers.map(({ key, latest, clicks, ads, ips }) => (
                  <tr key={key}>
                    <td className="max-w-0 truncate py-1.5">
                      {latest.userId != null ? (
                        <>
                          <span className="text-ink">{latest.userName ?? `user ${latest.userId}`}</span>
                          <span className="text-subtle">
                            {' '}
                            · {latest.ip ?? 'no address'}
                            {ips > 1 ? ` and ${ips - 1} more` : ''}
                          </span>
                        </>
                      ) : (
                        <span>
                          {latest.ip ?? 'unknown address'} <span className="text-subtle">· guest</span>
                        </span>
                      )}
                    </td>
                    <td className="max-w-48 truncate py-1.5 pl-6 text-subtle">{placeLabel(latest)}</td>
                    <td className="py-1.5 pl-6 text-right">{clicks}</td>
                    <td className="py-1.5 pl-6 text-right">{ads}</td>
                    <td className="py-1.5 pl-6 text-right whitespace-nowrap text-subtle">{utcTime(latest.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-subtle">No ad clicks {inRange}.</p>
        )}
      </section>

      <StatTable title="By Amazon store" rows={stats.stores} name={(key) => `${countryName(key)} (${key})`} empty={empty} />

      <StatTable title="Outside the US, by kind" rows={stats.abroad} name={(key) => KIND_LABEL[key as AdKind] ?? key} empty={`No ads shown outside the US ${inRange}.`} />

      <section className="surface space-y-5 p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold">By tracking id</h2>
          <p className="text-xs text-subtle">The Associates id on the link of each ad shown and clicked, with what it was shown as and where.</p>
        </div>
        {stats.tags.length ? (
          stats.tags.map(({ total, slots, kinds, ads }) => {
            const [store, tag] = total.key.split('|');
            return (
              <div key={total.key} className="space-y-3 rounded-xl border border-line p-3 sm:p-4">
                <StatTable
                  title=""
                  rows={[total]}
                  name={() => (
                    <>
                      <span className="font-mono text-sm font-semibold">{tag || 'no id'}</span>{' '}
                      <span className="text-subtle">
                        {countryName(store)} ({store})
                      </span>
                    </>
                  )}
                  empty={empty}
                  bare
                />
                <div className="grid gap-4 lg:grid-cols-3">
                  <StatTable title="Placement" rows={slots} name={(key) => SLOT_LABEL[key as keyof typeof SLOT_LABEL] ?? key} empty={empty} split={false} bare />
                  <StatTable title="Kind" rows={kinds} name={(key) => KIND_LABEL[key as keyof typeof KIND_LABEL] ?? key} empty={empty} split={false} bare />
                  <StatTable title="Top ads" rows={ads} name={adName} empty={empty} split={false} bare />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-subtle">{empty}</p>
        )}
      </section>

      <section className="surface space-y-4 p-4 sm:p-5">
        <h2 className="text-base font-semibold">Where clicks came from</h2>
        {stats.places.length ? <PlaceMap places={stats.places} noun="click" /> : null}
        {stats.countries.length ? (
          <div className="grid gap-4 text-sm lg:grid-cols-3">
            <PlaceTable title="Country" rows={stats.countries} name={(key) => countryName(key || null)} />
            <PlaceTable title="Region" rows={stats.regions} name={(key) => key} />
            <PlaceTable title="City" rows={stats.cities} name={(key) => key} />
          </div>
        ) : (
          <p className="text-sm text-subtle">No ad clicks {inRange}.</p>
        )}
        <p className="text-xs text-faint">
          <a href="https://db-ip.com" className="text-inherit">
            IP Geolocation by DB-IP
          </a>
        </p>
      </section>

      <section className="surface p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold">Latest clicks</h2>
        {total ? (
          <ul className="divide-y divide-line text-sm">
            {stats.clicks.slice(0, RECENT).map((c) => {
              const name = programName(c.program) ?? c.adTitle ?? c.adKey;
              return (
                <li key={c.id} className="py-2">
                  <div className="flex items-center gap-3">
                    {c.adPinId ? <PinThumb thumbName={c.thumbName} originalUrl={c.originalUrl} title={c.adTitle} /> : null}
                    <span className="min-w-0 flex-1 truncate" title={name}>
                      {name}
                    </span>
                    <span className="shrink-0 text-xs whitespace-nowrap text-subtle">
                      {KIND_LABEL[c.kind]} · {SLOT_LABEL[c.slot as keyof typeof SLOT_LABEL] ?? c.slot} · {c.store}
                      {c.tag ? ` · ${c.tag}` : ''}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-subtle tabular-nums">
                    <span className="text-ink">{c.userId != null ? (c.userName ?? `user ${c.userId}`) : (c.ip ?? 'unknown address')}</span>
                    <span>{placeLabel(c)}</span>
                    {c.pinId ? (
                      <Link href={pinPath({ id: c.pinId, title: c.pinTitle ?? '' })} className="max-w-64 truncate text-link">
                        on {c.pinTitle || `pin ${c.pinId}`}
                      </Link>
                    ) : c.page ? (
                      <span className="max-w-64 truncate" title={pagePath(c)}>
                        on {siteSection(pagePath(c))}
                        {siteSection(pagePath(c)) === 'Search' ? ` · ${readable(pagePath(c).split('?')[1] ?? '')}` : ''}
                      </span>
                    ) : null}
                    <span className="ml-auto">{utcTime(c.at)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-subtle">No ad clicks {inRange}.</p>
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
          <div className="mt-1 text-muted">
            <strong className="text-ink tabular-nums">{tip.bucket.shown}</strong> shown
          </div>
        </div>
      ) : null}
    </div>
  );
}
