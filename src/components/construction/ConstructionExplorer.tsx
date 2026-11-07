'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { PinThumb } from '@/components/pin/PinThumb';
import { useT } from '@/lib/client/i18n';
import { categoryLabel } from '@/lib/i18n/labels';
import { formatMoney } from '@/lib/people';
import { CONSTRUCTION_PAD_YEARS, CONSTRUCTION_YEAR_PX, CONSTRUCTION_YEARS, type ConstructionBar, type ConstructionSector, type ConstructionStatus } from '@/lib/construction';

// Fixed shades like the buildout stages on the pin page: they carry both themes.
const TONE: Record<ConstructionStatus, string> = { Proposed: 'bg-slate-400', 'In Progress': 'bg-blue-600', Completed: 'bg-emerald-500' };
const STATUS_KEY = { Proposed: 'proposed', 'In Progress': 'inProgress', Completed: 'completed' } as const;
const STATUSES: ConstructionStatus[] = ['Proposed', 'In Progress', 'Completed'];
const SECTORS: ConstructionSector[] = ['power', 'datacenter', 'factory', 'transport', 'housing', 'buildings', 'other'];
const SECTOR_KEY = { power: 'sectorPower', datacenter: 'sectorDatacenter', factory: 'sectorFactory', transport: 'sectorTransport', housing: 'sectorHousing', buildings: 'sectorBuildings', other: 'sectorOther' } as const;
const SORTS = ['start', 'end', 'cost', 'size'] as const;
type Sort = (typeof SORTS)[number];
const SORT_KEY = { start: 'sortStart', end: 'sortEnd', cost: 'sortCost', size: 'sortSize' } as const;

const DAY = 86_400_000;
// Only dollars are ranked and summed: figures in other currencies are never converted.
const usd = (b: ConstructionBar) => (b.priceCurrency === 'USD' && b.price ? b.price : 0);

function power(mw: number) {
  return mw >= 1000 ? `${(mw / 1000).toFixed(mw >= 10_000 ? 0 : 1)} GW` : `${Math.round(mw)} MW`;
}

// The builds under way over a window of years, as a span chart: filters by
// status and sector, a sort, a summary of what the filtered builds add up to,
// and a row per build with its picture, cost and size.
export function ConstructionExplorer({ bars, year, now }: { bars: ConstructionBar[]; year: number; now: number }) {
  const t = useT();
  const [statuses, setStatuses] = useState<ConstructionStatus[]>(STATUSES);
  const [sector, setSector] = useState<ConstructionSector | null>(null);
  const [sort, setSort] = useState<Sort>('start');
  const [sub, setSub] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const sectorRow = useRef<HTMLDivElement>(null);
  const [clipped, setClipped] = useState<Set<string>>(new Set());

  // What the Other pill holds, as pills of its own: the categories of its builds, most builds first.
  const subs = useMemo(() => {
    const n = new Map<string, number>();
    for (const b of bars) if (b.sector === 'other' && b.category) n.set(b.category, (n.get(b.category) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
  }, [bars]);

  // The category pills take the room the row has: those that would wrap onto a second line are hidden.
  useLayoutEffect(() => {
    const row = sectorRow.current;
    if (!row) return;
    const measure = () => {
      const kids = [...row.querySelectorAll<HTMLElement>('[data-sub]')];
      kids.forEach((k) => k.classList.remove('hidden'));
      const other = row.querySelector<HTMLElement>('[data-other]');
      const top = other?.offsetTop ?? kids[0]?.offsetTop ?? 0;
      // Other is the last pill: keep the category pills that fit on the first line beside it.
      const room = row.clientWidth - (other?.offsetWidth ?? 0) - 8;
      const fit = kids.filter((k) => k.offsetTop <= top + 4 && k.offsetLeft + k.offsetWidth - row.offsetLeft <= room);
      const keep = new Set(fit.map((k) => k.dataset.sub!));
      const next = new Set(kids.filter((k) => !keep.has(k.dataset.sub!)).map((k) => k.dataset.sub!));
      kids.forEach((k) => k.classList.toggle('hidden', next.has(k.dataset.sub!)));
      setClipped((prev) => (prev.size === next.size && [...next].every((x) => prev.has(x)) ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, [subs]);

  const rows = useMemo(() => {
    const kept = bars.filter((b) => statuses.includes(b.status) && (!sector || b.sector === sector) && (!sub || b.category === sub));
    const key: Record<Sort, (b: ConstructionBar) => number> = {
      start: (b) => Date.parse(b.start),
      end: (b) => Date.parse(b.end),
      cost: (b) => -usd(b),
      size: (b) => -(b.megawatts ?? 0),
    };
    return [...kept].sort((a, b) => key[sort](a) - key[sort](b) || a.id - b.id);
  }, [bars, statuses, sector, sub, sort]);

  const thisYear = new Date(now).getUTCFullYear();
  const stats = {
    builds: rows.length,
    cost: rows.reduce((n, b) => n + usd(b), 0),
    mw: rows.reduce((n, b) => n + (b.powerKind === 'generation' || b.powerKind === 'storage' ? (b.megawatts ?? 0) : 0), 0),
    finishing: rows.filter((b) => new Date(b.end).getUTCFullYear() === thisYear && b.status !== 'Completed').length,
  };

  const startYear = year - CONSTRUCTION_PAD_YEARS;
  const chartYears = CONSTRUCTION_YEARS + 2 * CONSTRUCTION_PAD_YEARS;
  // Open on the chosen window; the padding years either side are a scroll away.
  useLayoutEffect(() => { if (scroller.current) scroller.current.scrollLeft = CONSTRUCTION_PAD_YEARS * CONSTRUCTION_YEAR_PX; }, [year, rows.length > 0]);
  const from = Date.UTC(startYear, 0, 1);
  const span = Date.UTC(startYear + chartYears, 0, 1) - from;
  const pct = (ms: number) => Math.min(100, Math.max(0, ((ms - from) / span) * 100));
  const today = now >= from && now < from + span ? pct(now) : null;
  const years = Array.from({ length: chartYears }, (_, i) => ({ i, left: pct(Date.UTC(startYear + i, 0, 1)), label: String(startYear + i) }));
  // Quarter lines only while the window is short enough to leave them readable.
  const fine = chartYears <= 5;
  const grid = Array.from({ length: fine ? chartYears * 4 : chartYears }, (_, q) => ({ q, left: pct(fine ? Date.UTC(startYear + Math.floor(q / 4), (q % 4) * 3, 1) : Date.UTC(startYear + q, 0, 1)), strong: !fine || q % 4 === 0 }));
  // Centre today's line in the visible part of the chart (the title column stays pinned on the left).
  const goToday = () => {
    const box = scroller.current;
    const line = box?.querySelector('[data-today]');
    if (!box || !line) return;
    const titleW = box.querySelector('li > a')?.getBoundingClientRect().width ?? 0;
    const delta = line.getBoundingClientRect().left - box.getBoundingClientRect().left - (titleW + (box.clientWidth - titleW) / 2);
    box.scrollTo({ left: box.scrollLeft + delta, behavior: 'smooth' });
  };
  const fmt = new Intl.DateTimeFormat(t.locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-sm ${on ? 'border-ink bg-panel font-medium' : 'border-line hover:bg-panel'}`;
  const stat = (label: string, value: string) => (
    <div className="rounded-xl border border-line bg-panel px-4 py-3">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat(t('guides.construction.statBuilds'), stats.builds.toLocaleString(t.locale))}
        {stat(t('guides.construction.statCost'), stats.cost ? formatMoney(t.locale, stats.cost, 'USD') : '–')}
        {stat(t('guides.construction.statPower'), stats.mw ? power(stats.mw) : '–')}
        {stat(t('guides.construction.statFinishing', { year: String(thisYear) }), stats.finishing.toLocaleString(t.locale))}
      </div>

      <div ref={sectorRow} className="mb-2 flex flex-wrap items-center gap-2 overflow-hidden" style={{ maxHeight: '2.25rem' }}>
        <button type="button" className={chip(!sector)} aria-pressed={!sector} onClick={() => { setSector(null); setSub(null); }}>{t('guides.construction.sectorAll')}</button>
        {SECTORS.filter((s) => s !== 'other').map((s) => <button key={s} type="button" className={chip(sector === s && !sub)} aria-pressed={sector === s && !sub} onClick={() => { setSector(sector === s && !sub ? null : s); setSub(null); }}>{t(`guides.construction.${SECTOR_KEY[s]}`)}</button>)}
        {subs.map((name) => <button key={name} type="button" data-sub={name} className={`${chip(sub === name)} ${clipped.has(name) ? 'hidden' : ''}`} aria-pressed={sub === name} tabIndex={clipped.has(name) ? -1 : 0} onClick={() => { setSector(sub === name ? null : 'other'); setSub(sub === name ? null : name); }}>{categoryLabel(t, name)}</button>)}
        <button type="button" data-other className={chip(sector === 'other' && !sub)} aria-pressed={sector === 'other' && !sub} onClick={() => { setSector(sector === 'other' && !sub ? null : 'other'); setSub(null); }}>{t('guides.construction.sectorOther')}</button>
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {STATUSES.map((s) => {
            const on = statuses.includes(s);
            return (
              <button key={s} type="button" className={`${chip(on)} flex items-center gap-1.5`} aria-pressed={on} onClick={() => setStatuses(on ? statuses.filter((x) => x !== s) : [...statuses, s])}>
                <span className={`size-2.5 rounded-sm ${TONE[s]}`} />{t(`reserved.${STATUS_KEY[s]}`)}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
        {rows.length > 0 && <Link href={`/map?q=${encodeURIComponent(`pin:${rows.slice(0, 400).map((r) => r.id).join(',')}`)}&past=all&future=all&fit=results`} className={`${chip(false)} flex items-center gap-1.5 hover:no-underline`}><Icon name="map" className="size-3.5 text-link" />{t('pin.toMap')}</Link>}
        {today !== null && <button type="button" className={`${chip(false)} flex items-center gap-1.5`} onClick={goToday}><span className="size-2.5 rounded-sm bg-red-500" />{t('controls.today')}</button>}
        <label className="flex items-center gap-2 text-sm text-muted">
          {t('guides.construction.sortBy')}
          <select className="appearance-none rounded-lg border border-line bg-panel bg-no-repeat py-1 ps-3 pe-9 text-ink" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none' stroke='%238a8f9c' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 1.5l5 5 5-5'/%3E%3C/svg%3E\")", backgroundPosition: 'right 0.75rem center' }} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {SORTS.map((s) => <option key={s} value={s}>{t(`guides.construction.${SORT_KEY[s]}`)}</option>)}
          </select>
        </label>
        </div>
      </div>

      {rows.length ? (
        <div ref={scroller} className="overflow-x-auto rounded-xl border border-line bg-panel">
          <div style={{ minWidth: `calc(24rem + ${chartYears * CONSTRUCTION_YEAR_PX}px)` }}>
            <div className="flex h-8 border-b border-line text-xs text-muted">
              <div aria-hidden className="sticky start-0 z-20 w-72 shrink-0 border-e border-line bg-panel lg:w-96" />
              <div className="relative flex-1" style={{ minWidth: chartYears * CONSTRUCTION_YEAR_PX }}>
                {years.map((y) => <span key={y.i} className="absolute top-2 border-s border-line ps-1 font-medium" style={{ left: `${y.left}%` }}>{y.label}</span>)}
              </div>
            </div>
            <ul>
              {rows.map((bar) => {
                const s = Date.parse(bar.start);
                const e = Date.parse(bar.end);
                const left = pct(s);
                const width = Math.max(0.6, pct(e) - left);
                const label = `${bar.title}: ${fmt.format(s)} → ${fmt.format(e)} (${t(`reserved.${STATUS_KEY[bar.status]}`)})`;
                const facts = [[bar.city, bar.country].filter(Boolean).join(', '), bar.price ? formatMoney(t.locale, bar.price, bar.priceCurrency || 'USD') : null, bar.megawatts ? power(bar.megawatts) : null].filter(Boolean).join(' · ');
                return (
                  <li key={bar.id} className="flex items-center border-b border-line/60 last:border-b-0 hover:bg-page/60">
                    <div className="sticky start-0 z-20 flex w-72 shrink-0 items-center border-e border-line bg-panel lg:w-96">
                    <Link href={bar.href} className="flex min-w-0 flex-1 items-center gap-2 py-1 ps-3 text-sm" title={label}>
                      <PinThumb thumbName={bar.thumbName} originalUrl={bar.originalUrl} title={bar.title} className="h-9 w-12" />
                      <span className="min-w-0">
                        <span className="block truncate">{bar.title}</span>
                        <span className="block truncate text-xs text-muted">{facts}</span>
                      </span>
                    </Link>
                    </div>
                    <div className="relative h-11 flex-1" style={{ minWidth: chartYears * CONSTRUCTION_YEAR_PX }}>
                      {grid.map((g) => <span key={g.q} className={`absolute inset-y-0 border-s ${g.strong ? 'border-line' : 'border-line/30'}`} style={{ left: `${g.left}%` }} />)}
                      {today !== null && <span data-today className="absolute inset-y-0 z-10 w-px bg-red-500" style={{ left: `${today}%` }} />}
                      <Link href={bar.href} aria-label={label} title={`${label} · ${Math.round((e - s) / DAY)} d`} className={`absolute top-3 h-5 rounded ${TONE[bar.status]} ${s < from ? 'rounded-s-none' : ''} ${e >= from + span ? 'rounded-e-none' : ''}`} style={{ left: `${left}%`, width: `${width}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : <p className="rounded-xl border border-line bg-panel p-6 text-muted">{t('guides.construction.noMatch')}</p>}
    </div>
  );
}
