'use client';

import { useMemo, useState } from 'react';
import Link from '@/components/ui/Link';
import { PinThumb } from '@/components/pin/PinThumb';
import { useT } from '@/lib/client/i18n';
import { formatMoney } from '@/lib/people';
import { CONSTRUCTION_YEARS, type ConstructionBar, type ConstructionSector, type ConstructionStatus } from '@/lib/construction';

// Fixed shades like the buildout stages on the pin page: they carry both themes.
const TONE: Record<ConstructionStatus, string> = { Proposed: 'bg-slate-400', 'In Progress': 'bg-blue-600', Completed: 'bg-emerald-500' };
const STATUS_KEY = { Proposed: 'proposed', 'In Progress': 'inProgress', Completed: 'completed' } as const;
const STATUSES: ConstructionStatus[] = ['Proposed', 'In Progress', 'Completed'];
const SECTORS: ConstructionSector[] = ['power', 'datacenter', 'factory', 'other'];
const SECTOR_KEY = { power: 'sectorPower', datacenter: 'sectorDatacenter', factory: 'sectorFactory', other: 'sectorOther' } as const;
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

  const rows = useMemo(() => {
    const kept = bars.filter((b) => statuses.includes(b.status) && (!sector || b.sector === sector));
    const key: Record<Sort, (b: ConstructionBar) => number> = {
      start: (b) => Date.parse(b.start),
      end: (b) => Date.parse(b.end),
      cost: (b) => -usd(b),
      size: (b) => -(b.megawatts ?? 0),
    };
    return [...kept].sort((a, b) => key[sort](a) - key[sort](b) || a.id - b.id);
  }, [bars, statuses, sector, sort]);

  const thisYear = new Date(now).getUTCFullYear();
  const stats = {
    builds: rows.length,
    cost: rows.reduce((n, b) => n + usd(b), 0),
    mw: rows.reduce((n, b) => n + (b.powerKind === 'generation' || b.powerKind === 'storage' ? (b.megawatts ?? 0) : 0), 0),
    finishing: rows.filter((b) => new Date(b.end).getUTCFullYear() === thisYear && b.status !== 'Completed').length,
  };

  const from = Date.UTC(year, 0, 1);
  const span = Date.UTC(year + CONSTRUCTION_YEARS, 0, 1) - from;
  const pct = (ms: number) => Math.min(100, Math.max(0, ((ms - from) / span) * 100));
  const today = now >= from && now < from + span ? pct(now) : null;
  const years = Array.from({ length: CONSTRUCTION_YEARS }, (_, i) => ({ i, left: pct(Date.UTC(year + i, 0, 1)), label: String(year + i) }));
  // Quarter lines only while the window is short enough to leave them readable.
  const fine = CONSTRUCTION_YEARS <= 5;
  const grid = Array.from({ length: fine ? CONSTRUCTION_YEARS * 4 : CONSTRUCTION_YEARS }, (_, q) => ({ q, left: pct(fine ? Date.UTC(year + Math.floor(q / 4), (q % 4) * 3, 1) : Date.UTC(year + q, 0, 1)), strong: !fine || q % 4 === 0 }));
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

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" className={chip(!sector)} aria-pressed={!sector} onClick={() => setSector(null)}>{t('guides.construction.sectorAll')}</button>
        {SECTORS.map((s) => <button key={s} type="button" className={chip(sector === s)} aria-pressed={sector === s} onClick={() => setSector(sector === s ? null : s)}>{t(`guides.construction.${SECTOR_KEY[s]}`)}</button>)}
        <span className="mx-1 h-5 w-px bg-line" />
        {STATUSES.map((s) => {
          const on = statuses.includes(s);
          return (
            <button key={s} type="button" className={`${chip(on)} flex items-center gap-1.5`} aria-pressed={on} onClick={() => setStatuses(on ? statuses.filter((x) => x !== s) : [...statuses, s])}>
              <span className={`size-2.5 rounded-sm ${TONE[s]}`} />{t(`reserved.${STATUS_KEY[s]}`)}
            </button>
          );
        })}
        <label className="ms-auto flex items-center gap-2 text-sm text-muted">
          {t('guides.construction.sortBy')}
          <select className="rounded-lg border border-line bg-panel px-2 py-1 text-ink" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {SORTS.map((s) => <option key={s} value={s}>{t(`guides.construction.${SORT_KEY[s]}`)}</option>)}
          </select>
        </label>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <div className="min-w-[760px]">
            <div className="relative ms-64 h-8 border-b border-line text-xs text-muted">
              {years.map((y) => <span key={y.i} className="absolute top-2 border-s border-line ps-1 font-medium" style={{ left: `${y.left}%` }}>{y.label}</span>)}
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
                    <Link href={bar.href} className="flex w-64 shrink-0 items-center gap-2 px-3 py-1 text-sm" title={label}>
                      <PinThumb thumbName={bar.thumbName} originalUrl={bar.originalUrl} title={bar.title} className="h-9 w-12" />
                      <span className="min-w-0">
                        <span className="block truncate">{bar.title}</span>
                        <span className="block truncate text-xs text-muted">{facts}</span>
                      </span>
                    </Link>
                    <div className="relative h-11 flex-1">
                      {grid.map((g) => <span key={g.q} className={`absolute inset-y-0 border-s ${g.strong ? 'border-line' : 'border-line/30'}`} style={{ left: `${g.left}%` }} />)}
                      {today !== null && <span className="absolute inset-y-0 z-10 w-px bg-red-500" style={{ left: `${today}%` }} />}
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
