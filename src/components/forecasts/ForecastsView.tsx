'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ForecastCard } from '@/components/timeline/IndustryForecastPanel';
import styles from '@/components/restaurants/RestaurantGuide.module.css';
import { useT } from '@/lib/client/i18n';
import { formatForecastValue, industrySlug, type IndustryForecastJson } from '@/lib/industryForecast';

// The top tier: each group holds the industries (second tier) it is named for.
// An industry not listed lands in the last group.
// `name` is the English key: the hash slug and the id of the group's translated label.
const GROUPS: { name: string; key: 'tech' | 'economy' | 'energy' | 'culture' | 'society' | 'space'; industries: string[] }[] = [
  { name: 'Technology & AI', key: 'tech', industries: ['AI', 'Robotics', 'Semiconductors', 'Computing', 'Cybersecurity', 'Futurism'] },
  { name: 'Economy & Business', key: 'economy', industries: ['Economy', 'Business', 'Finance', 'Crypto', 'Labour', 'Retail', 'Manufacturing', 'Construction', 'Hospitality', 'Travel'] },
  { name: 'Energy & Planet', key: 'energy', industries: ['Energy', 'Automotive', 'Mining', 'Climate', 'Food', 'Disaster'] },
  { name: 'Culture & Media', key: 'culture', industries: ['Movie', 'Gaming', 'Anime', 'Manga', 'Comics', 'Tabletop', 'Sports', 'Fashion', 'Art'] },
  { name: 'Society & Security', key: 'society', industries: ['Health', 'Education', 'Law', 'Crime', 'Defense', 'Elections', 'Religion'] },
  { name: 'Space & Science', key: 'space', industries: ['Space', 'Astronomy'] },
];
const slug = industrySlug;
const groupOf = (industry: string) => GROUPS.find((g) => g.industries.includes(industry))?.name ?? GROUPS[GROUPS.length - 1].name;

// A panel with fewer than three points has no trend to draw: it is listed
// with the others of its group as a line of figures instead of a chart card.
const pointCount = (f: IndustryForecastJson) =>
  [...f.lines, ...(f.projection ? [f.projection] : []), ...f.earlier].reduce((n, l) => n + l.points.length, 0);
const isSparse = (f: IndustryForecastJson) => pointCount(f) < 3;

function SparseList({ items }: { items: IndustryForecastJson[] }) {
  const t = useT();
  return (
    <div className="rounded-lg border border-(--rule) bg-(--paper-raised) px-4 py-3">
      <p className="mb-1 text-[11px] font-bold tracking-[1.5px] text-(--soft) uppercase">{t('forecasts.glance')} · {items.length}</p>
      <ul className="divide-y divide-(--rule)">
        {items.map((f) => {
          const points = [...(f.projection?.points ?? []), ...f.lines.flatMap((l) => l.points)];
          return (
            <li key={f.slug}>
              <details className="group py-2.5 text-sm">
                <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="min-w-0 flex-[1_1_14rem]">
                    <span className="block text-[10px] font-bold tracking-wider text-(--soft) uppercase">{f.industry}</span>
                    <span className="font-medium">{f.title}</span>
                  </span>
                  <span className="min-w-0 max-w-full font-serif text-lg text-(--green) tabular-nums sm:text-end">
                    {points.length ? points.map((p) => `${formatForecastValue(f, p.value)}${points.length > 1 ? ` (${p.x})` : p.x ? ` (${p.x})` : ''}`).join(' → ') : '—'}
                  </span>
                  <span aria-hidden className="ms-auto text-(--soft) transition-transform group-open:rotate-90 sm:ms-0">›</span>
                </summary>
                {f.note ? <p className="mt-2 text-xs leading-relaxed text-(--soft)">{f.note}</p> : null}
                <ul className="mt-2 space-y-1.5 text-xs">
                  {f.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{s.label}</a>
                      {s.date ? <span className="text-(--soft)"> · {s.date}</span> : null}
                      {s.quote ? <blockquote className="mt-0.5 border-s-2 border-(--rule) ps-2 text-(--soft) italic">“{s.quote}”</blockquote> : null}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// The page's words are translated; the panels' own text (titles, notes, quotes, industry names) is the pins' own.
// Two tiers of tabs: a group, then an industry of that group. Panels that have
// a trend are charted; the sparse ones of a group share one list.
export function ForecastsView({ forecasts }: { forecasts: IndustryForecastJson[] }) {
  const t = useT();
  const [group, setGroup] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const tiers = useMemo(
    () =>
      GROUPS.map((g) => {
        const counts = new Map<string, number>();
        for (const f of forecasts) if (groupOf(f.industry) === g.name) counts.set(f.industry, (counts.get(f.industry) ?? 0) + 1);
        return { name: g.name, key: g.key, count: [...counts.values()].reduce((a, b) => a + b, 0), industries: [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) };
      }).filter((g) => g.count),
    [forecasts],
  );
  // The tabs live in the URL hash ("#energy-planet" or "#energy-planet/climate"), so a
  // tab can be linked to; read after mount so the server and first client render agree.
  const fromHash = useCallback(() => {
    const [g, i] = decodeURIComponent(window.location.hash.slice(1)).split('/');
    const tier = tiers.find((t) => slug(t.name) === g);
    setGroup(tier?.name ?? null);
    setIndustry(tier?.industries.find(([n]) => slug(n) === i)?.[0] ?? null);
  }, [tiers]);
  useEffect(() => {
    queueMicrotask(fromHash);
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [fromHash]);
  const writeHash = (g: string | null, i: string | null) => {
    const hash = g ? `#${slug(g)}${i ? `/${slug(i)}` : ''}` : '';
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`);
  };
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tiers
      .filter((g) => !group || g.name === group)
      .map((g) => {
        const items = forecasts.filter(
          (f) =>
            groupOf(f.industry) === g.name &&
            (!industry || f.industry === industry) &&
            (!q || [f.title, f.industry, ...f.tags, f.note ?? ''].some((s) => s.toLowerCase().includes(q))),
        );
        return { name: g.name, key: g.key, charts: items.filter((f) => !isSparse(f)), sparse: items.filter(isSparse) };
      })
      .filter((s) => s.charts.length + s.sparse.length);
  }, [forecasts, tiers, group, industry, query]);

  const pick = (g: string | null) => {
    setGroup(g);
    setIndustry(null);
    writeHash(g, null);
  };
  const activeTier = tiers.find((g) => g.name === group);
  const tab = (active: boolean) =>
    `flex-none whitespace-nowrap ${active ? 'border-(--text) bg-(--text) text-(--paper)' : 'border-(--rule) text-(--soft) hover:text-(--text)'}`;

  return (
    <>
      <div className="sticky top-0 z-20 -mx-3 border-b border-(--rule) bg-(--paper)/95 px-3 py-3 sm:-mx-6 sm:px-6 backdrop-blur">
        <div className="flex flex-col gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('forecasts.search')}
            aria-label={t('forecasts.search')}
            className="w-full rounded border border-(--rule) bg-(--paper-raised) px-3 py-2 text-sm text-(--text) placeholder:text-(--soft)"
          />
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 text-sm [scrollbar-width:thin]" role="tablist" aria-label={t('forecasts.groupLabel')}>
            {[{ name: null, label: t('forecasts.all'), count: forecasts.length }, ...tiers.map((g) => ({ name: g.name as string | null, label: t(`forecasts.groups.${g.key}`), count: g.count }))].map((g) => (
              <button key={g.name ?? 'all'} type="button" role="tab" aria-selected={group === g.name} onClick={() => pick(g.name)} className={`rounded border px-3.5 py-1.5 font-medium ${tab(group === g.name)}`}>
                {g.label} <span className="opacity-60">{g.count}</span>
              </button>
            ))}
          </div>
        </div>
        {activeTier ? (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 text-xs [scrollbar-width:thin]" role="group" aria-label={t('forecasts.industryLabel', { group: t(`forecasts.groups.${activeTier.key}`) })}>
            {[{ name: null, count: activeTier.count }, ...activeTier.industries.map(([name, count]) => ({ name: name as string | null, count }))].map((i) => (
              <button key={i.name ?? 'all'} type="button" aria-pressed={industry === i.name} onClick={() => { setIndustry(i.name); writeHash(group, i.name); }} className={`rounded-full border px-3 py-1 ${tab(industry === i.name)}`}>
                {i.name ?? t('forecasts.allIn', { group: t(`forecasts.groups.${activeTier.key}`) })} <span className="opacity-60">{i.count}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {sections.map((s) => (
        <section key={s.name} className={styles.section} aria-label={t(`forecasts.groups.${s.key}`)}>
          <div className={styles.sectionHeading}>
            <h2>{t(`forecasts.groups.${s.key}`)} <span>{String(s.charts.length + s.sparse.length).padStart(2, '0')}</span></h2>
          </div>
          {/* The cards take the page's paper colours rather than the site panel's. */}
          <div className="[--color-line:var(--rule)] [--color-panel:var(--paper-raised)]">
            {s.charts.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {s.charts.map((f) => <ForecastCard key={f.slug} forecast={f} />)}
              </div>
            ) : null}
            {s.sparse.length ? <div className={s.charts.length ? 'mt-4' : ''}><SparseList items={s.sparse} /></div> : null}
          </div>
        </section>
      ))}
      {sections.length === 0 ? <p className="mt-10 text-center text-sm text-(--soft)">{t('forecasts.noMatch', { query })}</p> : null}
    </>
  );
}
