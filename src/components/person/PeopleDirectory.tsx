'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from '@/components/ui/Link';
import { useT } from '@/lib/client/i18n';
import { CHART_COLORS, OCTAGON_AXES, octagonPoints, octagonRing, personPath, type OctagonAxis } from '@/lib/people';

// One person on the index: just what a card shows.
export type DirectoryPerson = {
  id: number;
  name: string;
  photoUrl: string | null;
  // "Republican · Maine", or the office for a former officeholder.
  line: string;
  // Each life phase as the eight axis scores (null: no evidence), for the mini radar.
  radar?: (number | null)[][];
};

export type DirectoryGroup = { key: string; heading: string; people: DirectoryPerson[] };

// Cards drawn before "More": a tab can hold hundreds, and each is an image
// fetched from Wikimedia, which turns away bursts of requests.
const PAGE = 60;

// Wikimedia serves a few widths ready-made (120, 250, 330, 500...); another
// width is rendered on request, which is slow and rate limited. A 48px card
// takes the 120.
export function thumb(url: string | null, width = 120): string | null {
  if (!url) return null;
  return url.includes('Special:FilePath/') ? url.replace(/([?&])width=\d+/, `$1width=${width}`) : url;
}

// The card's mini radar: the person's life phases overlapped on one small
// octagon, drawn like the big chart on the person's page. No labels and no
// scale: it is the shape, and the page has the figures.
function MiniRadar({ phases }: { phases: (number | null)[][] }) {
  const t = useT();
  const SIZE = 60;
  const RADIUS = 23;
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={48}
      height={48}
      role="img"
      aria-label={t('person.octagon.title')}
      className="shrink-0 rounded-lg bg-field ring-1 ring-line"
    >
      {/* The theme's own colours, so it sits on a light, dark or cream card. */}
      <polygon points={octagonRing(5, SIZE, RADIUS)} fill="none" className="stroke-ink/40" strokeWidth={0.8} />
      <polygon points={octagonRing(2.5, SIZE, RADIUS)} fill="none" className="stroke-ink/15" strokeWidth={0.6} />
      {phases.map((scores, i) => {
        const axes = Object.fromEntries(OCTAGON_AXES.flatMap((axis, a) => (scores[a] != null ? [[axis, { score: scores[a]! }]] : []))) as Partial<Record<OctagonAxis, { score: number }>>;
        const points = octagonPoints(axes, SIZE, RADIUS).filter((p) => p.score != null);
        const color = CHART_COLORS[i % CHART_COLORS.length];
        const path = points.map((p) => `${p.x},${p.y}`).join(' ');
        // Three or more documented axes make a shape; one or two are a point or
        // a line, drawn as such rather than closed into a shape that is not there.
        return (
          <g key={i}>
            {points.length >= 3 ? (
              <polygon points={path} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={1.25} strokeLinejoin="round" />
            ) : points.length === 2 ? (
              <polyline points={path} fill="none" stroke={color} strokeWidth={1.25} strokeLinecap="round" />
            ) : null}
            {points.length < 3 ? points.map((p, k) => <circle key={k} cx={p.x} cy={p.y} r={2.4} fill={color} />) : null}
          </g>
        );
      })}
    </svg>
  );
}

function initials(name: string): string {
  const parts = name.replace(/\(.*?\)/g, ' ').split(/\s+/).filter((p) => /^\p{L}/u.test(p));
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// A portrait, or the person's initials when there is none or it will not load.
function Avatar({ person }: { person: DirectoryPerson }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : thumb(person.photoUrl);
  if (!src) {
    return (
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-raised text-sm font-semibold text-muted" aria-hidden>
        {initials(person.name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- portraits come from Wikimedia Commons
    <img
      src={src}
      alt=""
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="size-12 min-w-0 shrink-0 rounded-lg bg-raised object-cover"
    />
  );
}

// A name for comparing: lower case, no accents.
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// The highest score a person has on one axis across their phases, or -1 when
// no phase documents it, so people with no evidence sort last.
function axisBest(p: DirectoryPerson, axis: number): number {
  let best = -1;
  for (const phase of p.radar ?? []) {
    const v = phase[axis];
    if (typeof v === 'number' && v > best) best = v;
  }
  return best;
}

// 'name' or an axis name: what the cards are ordered by.
type SortKey = 'name' | OctagonAxis;

// The people index in tabs: one tab per group (the executive, senators,
// representatives, governors, former officeholders, then the other fields),
// with a count on each, a name filter, and the cards of the open tab only.
// defaultKey is the tab that opens when the link names none (the first tab if omitted).
export function PeopleDirectory({
  groups,
  defaultKey,
  title,
  description,
}: {
  groups: DirectoryGroup[];
  defaultKey?: string;
  title: string;
  description: string;
}) {
  const t = useT();
  const [active, setActive] = useState(defaultKey ?? groups[0]?.key ?? '');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [sort, setSort] = useState<SortKey>('name');
  // Every sort opens descending (Z to A, highest first); the toggle flips it.
  const [descending, setDescending] = useState(true);

  // A link to /people#senator opens that tab. Read after hydration, so the
  // server's markup (the first tab) and the client's first render agree.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (hash && groups.some((g) => g.key === hash)) setActive(hash);
    });
    return () => cancelAnimationFrame(frame);
  }, [groups]);

  const group = groups.find((g) => g.key === active) ?? groups.find((g) => g.key === defaultKey) ?? groups[0];
  const needle = fold(query.trim());
  const searching = needle.length > 0;
  // Searching ignores the tabs: everyone in every group whose name or line
  // (party, state, office) matches, the names that start with it first. The
  // chosen sort and direction order either list; ties fall back to the name.
  const list = useMemo(() => {
    const byName = (a: DirectoryPerson, b: DirectoryPerson) => a.name.localeCompare(b.name);
    const axis = sort === 'name' ? -1 : OCTAGON_AXES.indexOf(sort);
    // People with no evidence on the axis stay last in either direction.
    const order = (a: DirectoryPerson, b: DirectoryPerson) => {
      if (axis < 0) return 0;
      const x = axisBest(a, axis);
      const y = axisBest(b, axis);
      if (x < 0 || y < 0) return Number(x < 0) - Number(y < 0);
      return descending ? y - x : x - y;
    };
    // Name order is A to Z; "descending" is Z to A.
    const named = (a: DirectoryPerson, b: DirectoryPerson) => (sort === 'name' && descending ? byName(b, a) : byName(a, b));
    if (!searching) {
      const people = group?.people ?? [];
      if (sort !== 'name') return [...people].sort((a, b) => order(a, b) || byName(a, b));
      return descending ? [...people].reverse() : people;
    }
    const seen = new Set<number>();
    const starts = (p: DirectoryPerson) => Number(fold(p.name).startsWith(needle));
    return groups
      .flatMap((g) => g.people)
      .filter((p) => !seen.has(p.id) && seen.add(p.id) && (fold(p.name).includes(needle) || fold(p.line).includes(needle)))
      .sort((a, b) => order(a, b) || starts(b) - starts(a) || named(a, b));
  }, [groups, group, needle, searching, sort, descending]);
  if (!group) return null;

  const pick = (key: string) => {
    setActive(key);
    setShown(PAGE);
    window.history.replaceState(null, '', `#${encodeURIComponent(key)}`);
  };

  return (
    <div>
      {/* The page's header: its title and description, and the name filter at the top right. */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="mb-3 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-3xl text-base text-muted">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:pt-1">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
            placeholder={t('person.filter')}
            aria-label={t('person.filter')}
            className="w-full min-w-0 rounded-full bg-field px-4 py-2 text-sm text-ink ring-1 ring-line ring-inset outline-none placeholder:text-subtle focus:ring-2 focus:ring-accent sm:w-64"
          />
          <div className="flex shrink-0 items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted">
            {t('person.sort')}
            <span className="relative inline-flex items-center">
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortKey);
                setDescending(true);
                setShown(PAGE);
              }}
              className="appearance-none rounded-full bg-field py-1.5 pr-8 pl-3 text-sm leading-5 text-ink ring-1 ring-line ring-inset outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="name">{t('person.sortName')}</option>
              {OCTAGON_AXES.map((a) => (
                <option key={a} value={a}>
                  {t(`person.octagon.axes.${a}`)}
                </option>
              ))}
            </select>
            <svg aria-hidden viewBox="0 0 12 12" className="pointer-events-none absolute right-3 h-3 w-3 text-subtle" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 4.5 6 8l3.5-3.5" />
            </svg>
          </span>
          </label>
          <button
            type="button"
            onClick={() => {
              setDescending((d) => !d);
              setShown(PAGE);
            }}
            title={descending ? t('person.sortDescending') : t('person.sortAscending')}
            aria-label={descending ? t('person.sortDescending') : t('person.sortAscending')}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-field text-ink ring-1 ring-line ring-inset outline-none hover:bg-raised focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg aria-hidden viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {descending ? <path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" /> : <path d="M6 2v8M2.5 6.5 6 10l3.5-3.5" />}
            </svg>
          </button>
          </div>
        </div>
      </div>

      {searching ? null : (
      <div role="tablist" aria-label={title} className="-mx-1 flex flex-wrap gap-2 px-1">
        {groups.map((g) => {
          const selected = g.key === group.key;
          return (
            <button
              key={g.key}
              id={`tab-${g.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="people-panel"
              onClick={() => pick(g.key)}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
                selected ? 'bg-accent text-white ring-accent' : 'bg-field text-muted ring-line hover:bg-raised hover:text-ink'
              }`}
            >
              {g.heading}
              <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${selected ? 'bg-white/20 text-white' : 'bg-raised text-subtle'}`}>{g.people.length}</span>
            </button>
          );
        })}
      </div>
      )}

      <div
        id="people-panel"
        {...(searching ? { role: 'region', 'aria-live': 'polite' as const } : { role: 'tabpanel', 'aria-labelledby': `tab-${group.key}` })}
        className="mt-6"
      >
        {searching ? <p className="mb-4 text-sm text-muted">{t('person.results', { count: list.length })}</p> : null}
        {list.length ? (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.slice(0, shown).map((p) => (
                <li key={p.id}>
                  <Link href={personPath(p.name)} className="floating flex items-center gap-3 px-3 py-2.5 hover:no-underline">
                    <Avatar person={p} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-ink">{p.name}</span>
                      {p.line ? <span className="truncate text-xs text-muted">{p.line}</span> : null}
                    </span>
                    <MiniRadar phases={p.radar ?? []} />
                  </Link>
                </li>
              ))}
            </ul>
            {list.length > shown ? (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className="rounded-full bg-field px-5 py-2 text-sm font-medium text-ink ring-1 ring-line ring-inset hover:bg-raised"
                >
                  {t('person.more')} · {list.length - shown}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted">{t('person.noMatches')}</p>
        )}
      </div>
    </div>
  );
}
