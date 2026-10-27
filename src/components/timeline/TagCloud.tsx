'use client';

import { addEscape, removeEscape } from '@/lib/client/escapeStack';
import { useRouter } from '@/lib/client/navigation';
import { CLOUD_QUERY_EVENT, HELD_QUERY_EVENT, setTagCloudOpen } from '@/lib/client/tagCloudOpen';
import { splitLocale, type Locale } from '@/lib/i18n/config';
import { Fragment, useCallback, useEffect, useId, useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { hrefKeepingDate, hrefNearDay } from '@/lib/client/returnSpot';
import { useScrollLock } from '@/lib/client/scrollLock';
import { refineQuery, removeFields, removeTerm, term } from '@/lib/searchTerms';
import { DRAG_QUERY_EVENT, isPinList, pinnedQueries, queryLabel, queryNamedBy, recentQueries, recordQuery, recordRecentQuery, saveQueryName, sharedQueries, suggestQueryName, syncQueryNames, togglePinnedQuery, useQueryNames } from '@/lib/savedQueries';
import { isCategory } from '@/lib/categories';
import { cloudTags, groupSelection, groupTags, isReserved, isStoredSiteTag, reservedPicked, reservedTag, reservedValues, RESERVED_TAGS, type TagCount, type TagGroup } from '@/lib/tags';
import { parseSearchQuery } from '@/server/util/searchQuery';
import { leaveDrawerForCloud, onOpenTagCloud } from '@/lib/client/controlsDrawer';
import { mergedSection, useInDrawerPanel, useMergedPanel } from './FloatingControls';
import { iconButton, PanelHeader } from './PanelHeader';
import { WordCloud } from './WordCloud';
import { WORLD_COLS, WORLD_LAND_PATH, WORLD_ROWS } from '@/lib/worldMask';
import { useT } from '@/lib/client/i18n';
import { FORMAT_WORDS } from '@/lib/i18n/formatWords';
import { tagLabel } from '@/lib/i18n/labels';
import type { MessageKey } from '@/lib/i18n/translate';

// Whether the big cloud was last left open. Search results remount with each
// query, so without this every pick would close it.
let rememberedExpanded = false;
// The big cloud's last counts: a pick in it is a new page with a new cloud,
// which would otherwise start at "Loading" and flash before redrawing.
let rememberedViewCounts: TagCount[] | null = null;
// Grouped (tags wrapped up into their larger category) or every tag on its own.
let rememberedWrapped = true;

// Counts read ahead, by URL. A cold count is ~1.3s away on production (the
// server scores every pin's confidence when its cache has gone), so the page
// asks for the big cloud's counts once it is idle, and opening it then shows
// its tags at once. Held a minute, then asked
// again; a failed one is forgotten.
const AHEAD_MS = 60_000;
const ahead = new Map<string, { at: number; counts: Promise<TagCount[]> }>();

function countsFor(url: string): Promise<TagCount[]> {
  const held = ahead.get(url);
  if (held && Date.now() - held.at < AHEAD_MS) return held.counts;
  const counts = api.get<TagCount[]>(url);
  counts.catch(() => ahead.delete(url));
  ahead.set(url, { at: Date.now(), counts });
  return counts;
}

type PlaceCount = { name: string; country: string | null; count: number; lat: number | null; lon: number | null };
type PlaceCounts = { country: PlaceCount[]; city: PlaceCount[] };

// The place map's counts (countries and cities in one answer), read ahead like the tags'.
const placesAhead = new Map<string, { at: number; counts: Promise<PlaceCounts> }>();

function placesFor(url: string): Promise<PlaceCounts> {
  const held = placesAhead.get(url);
  if (held && Date.now() - held.at < AHEAD_MS) return held.counts;
  const counts = api.get<PlaceCounts>(url);
  counts.catch(() => placesAhead.delete(url));
  placesAhead.set(url, { at: Date.now(), counts });
  return counts;
}

// The place counts' URL for a tag cloud's counts URL: the same posted-within cutoff.
function placesUrl(countsUrl: string) {
  const own = new URLSearchParams(countsUrl.split('?')[1] ?? '');
  const params = new URLSearchParams({ limit: String(VIEW_LIMIT) });
  for (const key of ['created_since', 'created_within']) if (own.get(key)) params.set(key, own.get(key)!);
  return `/api/pins/place-counts?${params.toString()}`;
}

// Asks for these counts when the browser has nothing better to do.
function readAhead(urls: string[]) {
  const go = () => urls.forEach((url) => void (url.startsWith('/api/pins/place-counts') ? placesFor(url) : countsFor(url)).catch(() => {}));
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(go, { timeout: 3000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(go, 1500);
  return () => clearTimeout(id);
}

// What is picked, in brief ("Artemis", "Artemis +2"), or 'All' for nothing.
function tagSummary(selected: string[], locale: Locale = 'en') {
  return !selected.length ? FORMAT_WORDS[locale].all : selected.length === 1 ? selected[0] : `${selected[0]} +${selected.length - 1}`;
}

// The value on the floating controls' tags pill (under "Tags"): what the
// cloud has picked, the site's own filters among the tags.
export function tagPillSummary(query?: string, locale: Locale = 'en') {
  const picked = parseSearchQuery(query);
  return tagSummary([...reservedPicked(picked), ...picked.tags.filter((name) => !isReserved(name))], locale);
}

// The tag filter in the floating controls, the first of them: a row saying
// what is picked that opens the big tag cloud (TagCloudView) over the page,
// of the tags of the pins showing - the timeline's, or the search's results
// with its tag: terms left out - sized by how many pins carry each. A tag
// toggles its tag: term in the search query, so it shows and is edited in the
// navbar's search box; off the search page a pick starts a search - unless
// the page takes the query itself (the map does, staying where it is).
//
// Between lg and xl its row is hidden and the tags pill opens the cloud
// (FloatingControls); below lg the row rides in the nav drawer's "Filters".
export function TagCloud({
  query,
  onlyWatched = false,
  postedWithin = null,
  createdSince = null,
  onQuery,
  className = '',
}: {
  query?: string;
  onlyWatched?: boolean;
  postedWithin?: string | null;
  createdSince?: string | null;
  // Where a pick goes when it is not a search of its own: the page is handed
  // the edit to make to the query it already shows (the map filters its
  // markers by it rather than leaving for the results).
  onQuery?: (edit: (query: string) => string) => void;
  className?: string;
}) {
  const router = useRouter();
  const t = useT();
  // A section of the xl column's one "Filters" panel: open whenever it is.
  const mergedOpen = useMergedPanel();
  const merged = mergedOpen !== null;
  const inDrawer = useInDrawerPanel();
  // The big cloud over the page (TagCloudView).
  const [expanded, setExpandedState] = useState(() => rememberedExpanded);
  const setExpanded = (next: boolean) => {
    rememberedExpanded = next;
    setTagCloudOpen(next);
    setExpandedState(next);
  };
  const [wrapped, setWrappedState] = useState(() => rememberedWrapped);
  const setWrapped = (next: boolean) => {
    rememberedWrapped = next;
    setWrappedState(next);
  };
  const [searching, startSearch] = useTransition();
  // What the cloud has picked while it is open but not yet searched: the search
  // runs when it closes (SearchBox holds it), and the picks read from here meanwhile.
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [query, expanded]);
  useEffect(() => {
    const held = (event: Event) => setPending(String((event as CustomEvent).detail?.q ?? ''));
    window.addEventListener(HELD_QUERY_EVENT, held);
    return () => window.removeEventListener(HELD_QUERY_EVENT, held);
  }, []);
  const parsed = useMemo(() => parseSearchQuery(pending ?? query), [pending, query]);
  // What is picked, the tags and the site's own filters apart: only the tags
  // are sized, grouped and counted against the cloud's limit, and a site
  // filter writes a term of its own (confidence:) rather than a tag: term.
  const picked = useMemo(() => parsed.tags.filter((name) => !isReserved(name)), [parsed]);
  const pickedFilters = useMemo(() => reservedPicked(parsed), [parsed]);
  // Tags left out (-tag:): a second click on a picked tag, a third drops it.
  const pickedOut = useMemo(() => parsed.excludeTags, [parsed]);
  const [selected, setSelected] = useOptimistic(picked);
  const [reserved, setReserved] = useOptimistic(pickedFilters);
  const [excluded, setExcluded] = useOptimistic(pickedOut);

  const params = new URLSearchParams();
  if (query != null) params.set('q', query);
  if (query != null && onlyWatched) params.set('f', 'watch');
  if (createdSince) params.set('created_since', createdSince);
  else if (postedWithin) params.set('created_within', postedWithin);
  const countsUrl = `/api/pins/tag-counts?${params.toString()}`;

  // Read ahead: the big cloud's counts (its button is here, and the drawer
  // and the tags pill open it too).
  useEffect(() => readAhead([viewUrl(countsUrl), placesUrl(countsUrl)]), [countsUrl]);

  // Combined searches are remembered for the cloud's row of them.
  useEffect(() => {
    if (query) {
      recordQuery(query);
      recordRecentQuery(query);
    }
  }, [query]);
  const openQuery = (next: string) => go(() => next, parseSearchQuery(next).tags.filter((name) => !isReserved(name)), reservedPicked(parseSearchQuery(next)), parseSearchQuery(next).excludeTags);

  const isSelected = (name: string) => selected.some((s) => s.toLowerCase() === name.toLowerCase());
  const isExcluded = (name: string) => excluded.some((s) => s.toLowerCase() === name.toLowerCase());
  const summary = tagSummary([...reserved, ...selected, ...excluded.map((name) => `−${name}`)], t.locale);

  function go(edit: (q: string) => string, next: string[], nextReserved: string[] = reserved, nextExcluded: string[] = excluded) {
    if (expanded) {
      const q = edit(pending ?? query ?? '');
      const widened = next.length + nextReserved.length + nextExcluded.length < selected.length + reserved.length + excluded.length;
      setPending(q);
      window.dispatchEvent(new CustomEvent(CLOUD_QUERY_EVENT, { detail: { q, widen: widened } }));
      return;
    }
    if (onQuery) {
      startSearch(() => {
        setSelected(next);
        setReserved(nextReserved);
        setExcluded(nextExcluded);
        onQuery(edit);
      });
      return;
    }
    const current = new URLSearchParams(splitLocale(window.location.pathname).path === '/search' ? window.location.search : '');
    const q = edit(current.get('q') || '');
    if (q) current.set('q', q);
    else current.delete('q');
    // Nothing left to search for or filter by: that's the timeline.
    const href = current.size ? `/search?${current.toString()}` : '/';
    // Fewer tags picked is a wider search, which stays on the same date; more
    // opens on the day nearest it.
    const widened = next.length + nextReserved.length + nextExcluded.length < selected.length + reserved.length + excluded.length;
    startSearch(() => {
      setSelected(next);
      setReserved(nextReserved);
      setExcluded(nextExcluded);
      router.push(widened ? hrefKeepingDate(href) : hrefNearDay(href));
    });
  }

  // A tag's term, taken out or put in. category: is the old name for a
  // category's tag (0043) and a query may still hold one, so both spellings
  // come out, each either way round; what goes back in is always tag: or -tag:.
  const withoutTag = (query: string, name: string) =>
    (['category', 'tag', '-category', '-tag'] as const).reduce((q, field) => removeTerm(q, field, name), query);
  const others = (list: string[], name: string) => list.filter((s) => s.toLowerCase() !== name.toLowerCase());
  // Each click moves a tag on a step: off, then picked (tag:), then left out
  // (-tag:), then off again.
  const toggle = (name: string) => {
    if (isSelected(name)) {
      go((q) => refineQuery(withoutTag(q, name), '-tag', name), others(selected, name), reserved, [...others(excluded, name), name]);
    } else if (isExcluded(name)) {
      go((q) => withoutTag(q, name), selected, reserved, others(excluded, name));
    } else {
      go((q) => refineQuery(withoutTag(q, name), 'tag', name), [...selected, name], reserved, others(excluded, name));
    }
  };

  // A site filter's own term, put in or taken out. Taken out in every
  // spelling the search reads it by (confidence:unverified is the stored
  // confidence:unknown), so one typed by hand comes out too.
  const withoutReserved = (query: string, name: string) => {
    const site = reservedTag(name);
    if (!site) return query;
    if (site.field === 'posted' || site.field === 'updated') return removeFields(query, [site.field]);
    return reservedValues(site).reduce((q, value) => removeTerm(q, site.field, value), query);
  };
  const toggleReserved = (name: string) => {
    const site = reservedTag(name);
    if (!site) return;
    const on = reserved.some((r) => r.toLowerCase() === name.toLowerCase());
    go(
      (q) => (on ? withoutReserved(q, name) : refineQuery(withoutReserved(q, name), site.field, site.value)),
      selected,
      on ? reserved.filter((r) => r.toLowerCase() !== name.toLowerCase()) : [...reserved, name],
    );
  };
  // A place's term, put in or taken out: the cloud's map view picks places
  // with place:, which searches the address a pin was given.
  const places = parsed.places;
  const togglePlace = (name: string) => {
    const on = places.some((p) => p.toLowerCase() === name.toLowerCase());
    go((q) => (on ? removeTerm(q, 'place', name) : refineQuery(q, 'place', name)), selected);
  };
  const clear = () => go((q) => places.reduce((rest, name) => removeTerm(rest, 'place', name), reserved.reduce(withoutReserved, [...selected, ...excluded].reduce(withoutTag, q))), [], [], []);

  // Opens on the tags, or on the map of places (the Places row).
  const openCloud = (map = false) => {
    rememberedPlaces = map;
    // From the drawer, the cloud would open under it; closing the cloud
    // leaves the drawer shut, back on the page.
    if (inDrawer) leaveDrawerForCloud();
    setExpanded(true);
  };
  const closeCloud = () => setExpanded(false);
  // The tags pill between lg and xl, and the drawer's.
  useEffect(() => onOpenTagCloud(() => openCloud()));

  return (
    <div className={`floating flex min-h-0 flex-col text-sm ${merged ? mergedSection : ''} ${className}`}>
      {/* The same row the sliders under it fold behind; this one opens the big cloud. */}
      <PanelHeader
        caption={t('controls.tags')}
        captionClass="font-semibold text-tags"
        value={summary}
        open={false}
        onToggle={() => openCloud()}
        opensDialog
        label={t('tagCloud.tagsSummary', { summary })}
        reset={selected.length || reserved.length || excluded.length ? { label: t('tagCloud.clear'), onClick: clear } : undefined}
      />
      {/* Its own row under the tags: the same cloud, opened on the map of places. */}
      <PanelHeader
        caption={t('tagCloud.places')}
        captionClass="font-semibold text-tags"
        value={tagSummary(places, t.locale)}
        open={false}
        onToggle={() => openCloud(true)}
        opensDialog
        label={t('tagCloud.placesSummary', {
          summary: tagSummary(places, t.locale),
        })}
        reset={
          places.length
            ? {
                label: t('tagCloud.clear'),
                onClick: () => go((q) => places.reduce((rest, name) => removeTerm(rest, 'place', name), q), selected),
              }
            : undefined
        }
      />
      {expanded ? (
        <TagCloudView
          countsUrl={countsUrl}
          selected={selected}
          excluded={excluded}
          reserved={reserved}
          busy={searching}
          wrapped={wrapped}
          onWrappedChange={setWrapped}
          onToggle={toggle}
          places={places}
          onTogglePlace={togglePlace}
          onToggleReserved={toggleReserved}
          onOpenQuery={openQuery}
          currentQuery={pending ?? query ?? ''}
          onClear={clear}
          onClose={closeCloud}
        />
      ) : null}
    </div>
  );
}

// The site's own filters (RESERVED_TAGS): the thread tag, how firmly a pin's
// date is given, and how well the pin is evidenced. They read as tags and are
// picked like tags, but nobody wrote them, so they lead the cloud in a strip
// of their own - in their own order rather than by count, outlined and locked
// rather than sized - and never stand among the words people typed. A filter
// no pin here answers is left out, unless it is picked (which is how it is
// unpicked again).
function ReservedFilters({
  counts,
  selected,
  needle = '',
  showAll = false,
  onToggle,
  large = false,
  className = '',
}: {
  counts: TagCount[];
  selected: string[];
  // The find box narrows these too, by the name as it is read here.
  needle?: string;
  // Under an OR query the counts are of the first group alone, so none is hidden for having none.
  showAll?: boolean;
  onToggle: (name: string) => void;
  // Bigger in the big cloud, where there is room; small in the panel.
  large?: boolean;
  className?: string;
}) {
  const t = useT();
  const on = (name: string) => selected.some((s) => s.toLowerCase() === name.toLowerCase());
  const shown = RESERVED_TAGS.map((filter) => ({
    ...filter,
    label: tagLabel(t, { name: filter.name, kind: 'reserved' }),
    count: counts.find((c) => c.name.toLowerCase() === filter.name.toLowerCase())?.count ?? 0,
  }))
    .filter((filter) => showAll || filter.count > 0 || on(filter.name))
    .filter((filter) => !needle || filter.label.toLowerCase().includes(needle) || filter.name.toLowerCase().includes(needle));
  if (!shown.length) return null;
  return (
    <div role="group" aria-label={t('tagCloud.reserved')} className={`flex flex-col ${large ? 'gap-2' : 'gap-1.5'} ${className}`}>
      <span aria-hidden className={`inline-flex items-center gap-1 font-semibold tracking-wide text-faint uppercase ${large ? 'text-xs' : 'text-[11px]'}`}>
        <Icon name="lock" className={large ? 'size-3.5' : 'size-3'} />
        {t('tagCloud.reserved')}
      </span>
      <div className={`flex items-center overflow-x-auto pb-1 [scrollbar-width:thin] ${large ? 'gap-2' : 'gap-1.5'}`}>
      {shown.map((filter) => (
        <button
          key={filter.name}
          type="button"
          aria-pressed={on(filter.name)}
          onClick={() => onToggle(filter.name)}
          // Dragged to the search box, a pill adds its term to the query (SearchBox's drop).
          draggable
          onDragStart={(event) => {
            const text = term(filter.field, filter.value);
            event.dataTransfer.setData('application/x-chronopin-term', text);
            event.dataTransfer.setData('text/plain', text);
            event.dataTransfer.effectAllowed = 'copy';
          }}
          title={`${t('tagCloud.reservedTitle', { name: filter.label })}\n${t('tagCloud.pins', { count: filter.count })}`}
          className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-dashed transition-colors ${large ? 'gap-1.5 px-3 py-1 text-sm' : 'gap-1 px-1.5 py-0.5 text-[11px]'} ${
            isStoredSiteTag(filter.name)
              ? on(filter.name) ? 'border-construction bg-construction/20 text-construction' : 'border-construction/50 bg-construction/10 text-construction hover:border-construction hover:bg-construction/20'
              : on(filter.name) ? 'border-accent/60 bg-accent/15 text-link' : 'border-line text-muted hover:border-tint/40 hover:text-ink'
          }`}
        >
          <Icon name={filter.icon} className={`shrink-0 ${large ? 'size-4' : 'size-3'}`} />
          {filter.label}
          <span className={`${isStoredSiteTag(filter.name) ? 'text-current opacity-80' : 'text-subtle'} tabular-nums`}>
            {filter.count}
            <span className="sr-only"> {t('tagCloud.pinsWord', { count: filter.count })}</span>
          </span>
        </button>
      ))}
      </div>
    </div>
  );
}

// The combined searches this viewer runs most (savedQueries), one click each.
function SavedQueries({ current, onOpen, className = '', placesOnly = false }: { current: string; onOpen: (query: string) => void; className?: string; placesOnly?: boolean }) {
  const t = useT();
  const label = t('tagCloud.savedQueries');
  const [popular, setPopular] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);
  // Names given to searches (shared); an unnamed pin: list stays out of the row.
  const names = useQueryNames();
  const [naming, setNaming] = useState<string | null>(null);
  const [suggested, setSuggested] = useState('');
  const { isLoggedIn, user } = useSession();
  // A pill dragged by pointer (not the browser's drag-and-drop, whose snapshot
  // can't change): a floating copy follows the cursor and turns amber over the zone.
  const [drag, setDrag] = useState<{ q: string; x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const dragging = drag !== null;
  const zone = useRef<HTMLSpanElement>(null);
  const row = useRef<HTMLDivElement>(null);
  // Pinning moves a pill to the front: scroll there so it is not left out of view.
  const togglePin = (q: string) => {
    setPinned(togglePinnedQuery(q));
    row.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };
  const moved = useRef(false);
  const startDrag = (down: React.PointerEvent, q: string) => {
    if (down.button !== 0 || down.pointerType === 'touch' || (down.target as HTMLElement).closest('[data-pin-button]')) return;
    const from = { x: down.clientX, y: down.clientY };
    // Keep the copy where the pill was grabbed, so it doesn't jump to the cursor.
    const box = down.currentTarget.getBoundingClientRect();
    const grab = {
      x: down.clientX - (box.left + box.width / 2),
      y: down.clientY - (box.top + box.height / 2),
    };
    let live = false;
    const hit = (x: number, y: number) => {
      const r = zone.current?.getBoundingClientRect();
      return !!r && x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 10 && y <= r.bottom + 10;
    };
    const move = (e: PointerEvent) => {
      if (!live && Math.hypot(e.clientX - from.x, e.clientY - from.y) < 6) return;
      live = true;
      moved.current = true;
      setDrag({ q, x: e.clientX - grab.x, y: e.clientY - grab.y });
      setOver(hit(e.clientX, e.clientY));
    };
    const end = (e: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (live && e.type === 'pointerup' && hit(e.clientX, e.clientY)) togglePin(q);
      setDrag(null);
      setOver(false);
      // The click that follows a drag is not a search.
      setTimeout(() => (moved.current = false), 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };
  // The search box's selected filters dragged here: the same copy and zone, and a drop pins them (never unpins).
  useEffect(() => {
    const on = (event: Event) => {
      const { q, x, y, drop } = (event as CustomEvent).detail || {};
      if (!q) return;
      const r = zone.current?.getBoundingClientRect();
      const inside = !!r && x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 10 && y <= r.bottom + 10;
      if (drop) {
        setDrag(null);
        setOver(false);
        if (inside && !pinnedQueries().includes(q)) togglePin(q);
        return;
      }
      setDrag({ q, x, y });
      setOver(inside);
    };
    window.addEventListener(DRAG_QUERY_EVENT, on);
    return () => window.removeEventListener(DRAG_QUERY_EVENT, on);
  }, []);
  useEffect(() => {
    setRecent(recentQueries());
    setPinned(pinnedQueries());
    // Everyone's names are shared, so every viewer's row shows them.
    syncQueryNames();
    sharedQueries().then(setPopular);
  }, [current]);
  // Pinned searches lead (amber), then this viewer's recent ones (blue), then the popular ones.
  // The place cloud keeps to searches by place (a country or a city).
  const list = [...new Set([...pinned, ...Object.keys(names), ...recent, ...popular])].filter((q) => (!placesOnly || parseSearchQuery(q).places.length > 0) && (!isPinList(q) || names[q]));
  const now = current.trim().replace(/\s+/g, ' ');
  const label_ = (q: string) => (names[q] ? queryLabel(q, names[q]) : q);
  // The search on screen can be named when it is a list of exact pins or already in the row.
  const nameable = isLoggedIn && !placesOnly && !!now && (isPinList(now) || list.includes(now));
  if (!list.length && !nameable) return null;
  const toneFor = (q: string) =>
    names[q]
      ? `bg-emerald-500/15 font-medium text-ink hover:border-emerald-500 ${q === now ? 'border-emerald-500' : 'border-emerald-500/60'}`
      : pinned.includes(q)
      ? `bg-amber-500/20 font-medium text-ink hover:border-amber-500 ${q === now ? 'border-amber-500' : 'border-amber-500/70'}`
      : q === now
        ? 'border-accent/60 bg-accent/15 text-link'
        : recent.includes(q)
          ? 'border-link/40 bg-link/10 text-link hover:border-link/70'
          : 'border-line text-muted hover:border-tint/40 hover:text-ink';
  return (
    <div role="group" aria-label={label} className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
      <span aria-hidden className="inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-faint uppercase">
        <Icon name="search" className="size-3.5" />
        {label}
        {/* Drop a pill here to pin it, or a pinned pill to unpin it (the pin button on a pill does the same). */}
        <span
          ref={zone}
          aria-hidden
          title={t(drag && pinned.includes(drag.q) ? 'tagCloud.unpinQuery' : 'tagCloud.pinQuery')}
          className={`ms-1 grid size-6 place-items-center rounded-full border transition-colors ${over ? 'border-amber-500 bg-amber-500/25 text-amber-500' : dragging ? 'border-dashed border-amber-500/70 text-amber-500' : 'border-line text-faint'}`}
        >
          <Icon name={drag && pinned.includes(drag.q) ? 'thumbtackOff' : 'thumbtack'} className="size-3.5" />
        </span>
      </span>
      {nameable ? (
        // Collapses the box that names the search on screen.
        <button
          type="button"
          aria-expanded={naming === now}
          onClick={() => {
            if (naming === now) return setNaming(null);
            setSuggested('');
            setNaming(now);
            if (!names[now]) suggestQueryName(now).then((name) => name && setSuggested(name));
          }}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-muted transition-colors hover:border-amber-500 hover:text-ink"
        >
          {t('tagCloud.nameQuery')}
          <Icon name="chevron" aria-hidden className={`size-3.5 transition-transform ${naming === now ? 'rotate-180' : ''}`} />
        </button>
      ) : null}
      </div>
      <div ref={row} className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:thin]">
        {list.map((q) => {
          const isNamed = !!names[q];
          // A named pill wears a label icon instead of the pin's, unless it is pinned: then the pin shows.
          const isPinned = pinned.includes(q);
          const tone = toneFor(q);
          return (
            <span
              key={q}
              onPointerDown={(e) => startDrag(e, q)}
              className={`group relative shrink-0 select-none transition-transform has-[[data-pill]:active]:scale-[0.97] ${drag?.q === q ? 'opacity-40' : ''}`}
            >
              <button type="button" data-pill aria-pressed={q === now} onClick={() => !moved.current && onOpen(q)} title={names[q] && queryNamedBy(q) ? `${label_(q)}\n${t('tagCloud.namedBy', { name: queryNamedBy(q) as string })}` : q} className={`rounded-full border py-1 text-sm whitespace-nowrap transition-colors active:scale-100 ${isPinned || isNamed ? 'ps-8 pe-3' : 'px-3'} ${tone}`}>
                {label_(q)}
              </button>
              {isNamed && !isPinned ? <Icon name="tag" aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-emerald-600 dark:text-emerald-400" /> : null}
              {isPinned ? (
                // Over the pinned pill's own pin icon: click it to unpin.
                <button
                  type="button"
                  aria-label={t('tagCloud.unpinQuery')}
                  title={t('tagCloud.unpinQuery')}
                  onClick={() => togglePin(q)}
                  data-pin-button
                  className={`absolute start-[3px] top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full transition-colors ${isNamed ? 'text-emerald-600 hover:bg-emerald-500 active:bg-emerald-600 dark:text-emerald-400' : 'text-amber-600 hover:bg-amber-500 active:bg-amber-600 dark:text-amber-400'} hover:text-white active:text-white ${dragging ? 'pointer-events-none' : ''}`}
                >
                  <Icon name="thumbtack" aria-hidden className="size-3.5" />
                </button>
              ) : (
                // Covers the pill's right end on hover (a big target), inside its border, so it never resizes the pill.
                // A solid page-colored disc under a button in the pill's own tint, so it reads clearly and still matches.
                <span data-pin-button className={`absolute end-[3px] top-1/2 size-6 -translate-y-1/2 rounded-full bg-panel opacity-0 transition-opacity ${dragging ? 'pointer-events-none' : 'group-hover:opacity-100 has-[:focus-visible]:opacity-100'}`}>
                  <button
                    type="button"
                    aria-label={t(pinned.includes(q) ? 'tagCloud.unpinQuery' : 'tagCloud.pinQuery')}
                    title={t(pinned.includes(q) ? 'tagCloud.unpinQuery' : 'tagCloud.pinQuery')}
                    onClick={() => togglePin(q)}
                    className="grid size-full place-items-center rounded-full border border-line bg-panel text-muted transition-colors hover:border-amber-500 hover:bg-amber-500 hover:text-white active:border-amber-600 active:bg-amber-600 active:text-white"
                  >
                    <Icon name={pinned.includes(q) ? 'thumbtackOff' : 'thumbtack'} className="size-3.5" />
                  </button>
                </span>
              )}
            </span>
          );
        })}
      </div>
      {nameable ? (
        naming === now ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const value = new FormData(e.currentTarget).get('name');
              saveQueryName(now, typeof value === 'string' ? value : '', user?.userName ?? null);
              setNaming(null);
            }}
          >
            <input
              name="name"
              autoFocus
              key={suggested}
              defaultValue={names[now] ?? suggested}
              maxLength={60}
              placeholder={t('tagCloud.nameQueryPlaceholder')}
              aria-label={t('tagCloud.nameQueryPlaceholder')}
              onKeyDown={(e) => e.key === 'Escape' && setNaming(null)}
              className="min-w-0 flex-1 rounded-full bg-field px-3 py-1 text-sm text-ink ring-1 ring-line ring-inset placeholder:text-subtle focus:ring-2 focus:ring-link focus:outline-none"
            />
            <button type="submit" className="rounded-full border border-amber-500/70 bg-amber-500/20 px-3 py-1 text-sm font-medium text-ink hover:border-amber-500">
              {t('tagCloud.nameQuerySave')}
            </button>
          </form>
        ) : null
      ) : null}
      {drag &&
        createPortal(
          <span aria-hidden style={{ left: drag.x, top: drag.y }} className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-1/2 rounded-full bg-panel shadow-lg">
            <span className={`block rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors ${over ? 'border-amber-500 bg-amber-500/60 text-ink' : toneFor(drag.q)}`}>{label_(drag.q)}</span>
          </span>,
          document.body,
        )}
    </div>
  );
}

// The field that narrows the cloud. Its own clear button, not the browser's:
// the native one is a few px of cross jammed against the field's edge, which
// is a hard thing to hit. This one is a proper target and keeps the focus in
// the field, so the next tag can be typed straight away.
function FindTag({ value, onChange, className = '' }: { value: string; onChange: (value: string) => void; className?: string }) {
  const t = useT();
  const field = useRef<HTMLInputElement>(null);
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <input
        ref={field}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('tagCloud.find')}
        aria-label={t('tagCloud.find')}
        className="w-full rounded-full bg-field py-1.5 pe-9 ps-3.5 text-sm text-ink ring-1 ring-line ring-inset placeholder:text-subtle focus:ring-2 focus:ring-link focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          aria-label={t('tagCloud.findClear')}
          title={t('tagCloud.findClear')}
          onClick={() => {
            onChange('');
            field.current?.focus();
          }}
          // Sized to sit inside the field's pill: a larger circle would spill
          // over its rounded edge on hover.
          className="absolute end-1 flex size-7 items-center justify-center rounded-full text-subtle hover:bg-raised hover:text-ink"
        >
          <Icon name="close" className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}

// Grouped: tags wrapped up into their larger category (an award body's
// years, the market exchanges), or every tag on its own.
function GroupedToggle({ wrapped, onChange }: { wrapped: boolean; onChange: (wrapped: boolean) => void }) {
  const t = useT();
  return (
    <button
      type="button"
      aria-pressed={wrapped}
      onClick={() => onChange(!wrapped)}
      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-line ring-inset hover:bg-raised hover:text-ink aria-pressed:bg-accent/15 aria-pressed:text-link"
      title={wrapped ? t('tagCloud.ungroupTitle') : t('tagCloud.groupTitle')}
    >
      {t('tagCloud.grouped')}
    </button>
  );
}

// Either-or choices as one joined pill: exactly one is on.
function Segmented<V extends string>({ label, value, options, onChange }: { label: string; value: V; options: [V, string][]; onChange: (value: V) => void }) {
  return (
    <span role="radiogroup" aria-label={label} title={label} className="flex shrink-0 overflow-hidden rounded-full ring-1 ring-line ring-inset">
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className="px-2.5 py-1 text-xs font-medium text-muted hover:bg-raised hover:text-ink aria-checked:bg-accent/15 aria-checked:text-link"
        >
          {text}
        </button>
      ))}
    </span>
  );
}

// Places the cloud's map view last held, so it opens on the same view again.
let rememberedPlaces = false;
let rememberedCities = false;

// How many tags the big cloud reads.
const VIEW_LIMIT = 200;
const viewUrl = (countsUrl: string) => `${countsUrl}&limit=${VIEW_LIMIT}`;

const KIND_LABEL: Record<TagCount['kind'], MessageKey> = {
  award: 'tagCloud.kindAward',
  nomination: 'tagCloud.kindNomination',
  topic: 'tagCloud.kindTag',
  category: 'tagCloud.kindCategory',
  reserved: 'tagCloud.kindReserved',
};

// The tag cloud blown up over the page, WordArt style (WordCloud): up to 200
// tags packed into a cloud, the busiest largest, flowing around the pointer.
// Picks leave it open, so several can be made.
function TagCloudView({
  countsUrl,
  selected,
  excluded,
  reserved,
  busy,
  wrapped,
  onWrappedChange,
  onToggle,
  places,
  onTogglePlace,
  onToggleReserved,
  onOpenQuery,
  currentQuery,
  onClear,
  onClose,
}: {
  countsUrl: string;
  selected: string[];
  excluded: string[];
  reserved: string[];
  busy: boolean;
  wrapped: boolean;
  onWrappedChange: (wrapped: boolean) => void;
  onToggle: (name: string) => void;
  places: string[];
  onTogglePlace: (name: string) => void;
  onToggleReserved: (name: string) => void;
  onOpenQuery: (query: string) => void;
  currentQuery: string;
  onClear: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const t = useT();
  const [counts, setCounts] = useState<TagCount[] | null>(() => rememberedViewCounts);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState('');
  const [hot, setHot] = useState<TagGroup | null>(null);
  // The map view: places, countries or cities, in a cloud shaped like the world.
  const [mapView, setMapViewState] = useState(() => rememberedPlaces);
  const [cities, setCitiesState] = useState(() => rememberedCities);
  const setMapView = (next: boolean) => {
    rememberedPlaces = next;
    setHot(null);
    setMapViewState(next);
  };
  const setCities = (next: boolean) => {
    rememberedCities = next;
    setHot(null);
    setCitiesState(next);
  };
  const [placeData, setPlaceData] = useState<PlaceCounts | null>(null);
  const placeCounts = placeData ? (cities ? placeData.city : placeData.country) : null;
  const [placesFailed, setPlacesFailed] = useState(false);
  const url = viewUrl(countsUrl);
  useScrollLock(true);
  const rootRef = useRef<HTMLDivElement>(null);

  // Everything but the cloud and the navbar's search box is put out of reach
  // while it is open - blurred (globals.css, by the attribute) and inert - so
  // the one thing to do besides picking tags is search.
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-tag-cloud', '');
    const header = document.querySelector('[data-navbar]');
    const shut: HTMLElement[] = [];
    const inert = (el: Element) => {
      if (el instanceof HTMLElement && !el.inert && el !== rootRef.current) {
        el.inert = true;
        shut.push(el);
      }
    };
    for (let el = header; el && el.parentElement && el !== document.body; el = el.parentElement) {
      for (const sibling of el.parentElement.children) if (sibling !== el) inert(sibling);
    }
    header?.querySelectorAll(':scope > div > :not([data-search-slot]), [data-cloud-dim]').forEach(inert);
    return () => {
      html.removeAttribute('data-tag-cloud');
      for (const el of shut) el.inert = false;
    };
  }, []);

  // The same cloud with no search behind it.
  const [baseline, setBaseline] = useState<TagCount[] | null>(null);
  const baseUrl = useMemo(() => {
    const params = new URLSearchParams(countsUrl.split('?')[1] ?? '');
    params.delete('q');
    params.delete('f');
    return `/api/pins/tag-counts?${params.toString()}`;
  }, [countsUrl]);
  useEffect(() => {
    let cancelled = false;
    countsFor(viewUrl(baseUrl)).then((next) => !cancelled && setBaseline(next), () => {});
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  // The places for the map view, asked for once it is shown (usually already read ahead).
  useEffect(() => {
    if (!mapView) return;
    let cancelled = false;
    setPlacesFailed(false);
    placesFor(placesUrl(countsUrl)).then(
      (next) => !cancelled && setPlaceData(next),
      () => !cancelled && setPlacesFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [mapView, countsUrl]);

  useEffect(() => {
    let cancelled = false;
    countsFor(url).then(
      (next) => {
        if (cancelled) return;
        rememberedViewCounts = next;
        setCounts(next);
        setFailed(false);
      },
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  // One layer for as long as the cloud is open, whatever onClose is by then, so it keeps its place under layers opened after it.
  const closing = useRef(onClose);
  closing.current = onClose;
  useEffect(() => {
    const escape = () => closing.current();
    addEscape(escape);
    return () => removeEscape(escape);
  }, []);

  const needle = filter.trim().toLowerCase();
  // The site's own filters keep their strip, and the words in the cloud are
  // the tags people wrote.
  // The cloud always has its tags: the whole timeline's, with those the search has no pins for dimmed.
  const written = useMemo(() => {
    const here = new Map((counts ?? []).filter((t) => t.kind !== 'reserved' && !isReserved(t.name)).map((t) => [t.name.toLowerCase(), t]));
    const base = (baseline ?? []).filter((t) => t.kind !== 'reserved' && !isReserved(t.name));
    if (!base.length) return [...here.values()];
    const merged = base.map((t) => here.get(t.name.toLowerCase()) ?? { ...t, dim: true });
    const known = new Set(base.map((t) => t.name.toLowerCase()));
    return [...merged, ...[...here.values()].filter((t) => !known.has(t.name.toLowerCase()))];
  }, [counts, baseline]);
  const categories = useMemo(() => groupTags(written).filter((tag) => tag.kind === 'category'), [written]);
  const tags = useMemo<TagGroup[]>(() => {
    const groups = wrapped ? categories : written;
    const picked = wrapped ? groupSelection(groups, selected).filter((name) => isCategory(name) || groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) : selected;
    const all = cloudTags(groups, picked, VIEW_LIMIT);
    return needle ? all.filter((tag) => tag.name.toLowerCase().includes(needle) || tagLabel(t, tag).toLowerCase().includes(needle)) : all;
  }, [categories, written, selected, needle, wrapped, t]);
  const cloudSelected = useMemo(() => (wrapped ? groupSelection(tags, selected) : selected), [wrapped, tags, selected]);
  const cloudExcluded = useMemo(() => (wrapped ? groupSelection(tags, excluded) : excluded), [wrapped, tags, excluded]);
  const showAllReserved = useMemo(() => (parseSearchQuery(currentQuery).alternatives?.length ?? 0) > 1, [currentQuery]);
  // Places as tags (one word a name, a city's pins summed over any country it shares its name with), for the map.
  const placeTags = useMemo<TagCount[]>(() => {
    const byName = new Map<string, TagCount>();
    // A city's pins may lack coordinates under one spelling of its country and have them under another: the located row gives the place.
    const countries = new Map((placeData?.country ?? []).map((c) => [c.name, c]));
    for (const place of placeCounts ?? []) {
      const key = place.name.toLowerCase();
      const at = place.lat != null && place.lon != null ? place : null;
      const held = byName.get(key);
      if (held) {
        held.count += place.count;
        if (at && held.lat == null) [held.lat, held.lon] = [at.lat!, at.lon!];
      } else byName.set(key, { name: place.name, kind: 'topic', count: place.count, ...(at ? { lat: at.lat!, lon: at.lon! } : {}) });
    }
    // With none located, a city sits where its country does; a place that can be put nowhere is left off the map.
    for (const [key, tag] of byName) {
      if (tag.lat != null) continue;
      const home = (placeCounts ?? []).find((p) => p.name.toLowerCase() === key && p.country && countries.get(p.country)?.lat != null);
      const country = home && countries.get(home.country!);
      if (country) [tag.lat, tag.lon] = [country.lat!, country.lon!];
      else byName.delete(key);
    }
    const all = [...byName.values()];
    return needle ? all.filter((p) => p.name.toLowerCase().includes(needle)) : all;
  }, [placeCounts, placeData, needle]);
  const onHot = useCallback((tag: TagCount | null) => setHot(tag ? (tags.find((t) => t.name === tag.name) ?? placeTags.find((t) => t.name === tag.name) ?? tag) : null), [tags, placeTags]);

  // Portalled to the body, out of the floating controls' stacking context.
  // It starts under the navbar and sits below it (z-40) and its search
  // suggestions (z-50), so the search box stays in reach while the cloud is
  // open; above the floating controls (z-30). It fills the rest of the
  // screen, inset by a gutter wider than a phone.
  return createPortal(
    <div ref={rootRef} className="fixed inset-x-0 top-[52px] bottom-0 z-[35] flex items-center justify-center p-4 max-sm:p-0">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="floating relative flex size-full flex-col overflow-hidden max-sm:rounded-none max-sm:border-0">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3 max-sm:flex-wrap max-sm:px-3">
          <Icon name="tag" className="size-5 shrink-0 text-link" />
          <h2 id={titleId} className="shrink-0 text-base font-semibold text-ink">
            {mapView ? t('tagCloud.placeTitle') : t('tagCloud.title')}
          </h2>
          {!mapView && (counts || baseline) ? <span className="shrink-0 text-sm text-subtle">{t('tagCloud.tags', { count: wrapped ? tags.length : written.length })}</span> : null}
          <FindTag value={filter} onChange={setFilter} className="min-w-0 flex-1 max-sm:order-last max-sm:basis-full" />
          <span className="flex shrink-0 items-center gap-3 max-sm:ms-auto">
            {mapView ? (
              <Segmented
                label={t('tagCloud.placesTitle')}
                value={cities ? 'cities' : 'countries'}
                options={[
                  ['countries', t('tagCloud.places')],
                  ['cities', t('tagCloud.cities')],
                ]}
                onChange={(next) => setCities(next === 'cities')}
              />
            ) : (
              <GroupedToggle wrapped={wrapped} onChange={onWrappedChange} />
            )}
            {selected.length || reserved.length || places.length ? (
              <button type="button" onClick={onClear} className={iconButton} aria-label={t('tagCloud.clear')} title={t('tagCloud.clear')}>
                <Icon name="filter-off" className="size-5" />
              </button>
            ) : null}
            <button type="button" onClick={onClose} className={iconButton} aria-label={t('tagCloud.close')}>
              <Icon name="close" className="size-5" />
            </button>
          </span>
        </div>
        {mapView ? null : (
          <ReservedFilters counts={counts ?? []} selected={reserved} needle={needle} showAll={showAllReserved} onToggle={onToggleReserved} large className="border-b border-line px-5 py-2.5 max-sm:px-3" />
        )}
        <SavedQueries current={currentQuery} onOpen={onOpenQuery} placesOnly={mapView} className="border-b border-line px-5 py-2.5 max-sm:px-3" />
        <div aria-busy={busy || undefined} className="relative min-h-60 flex-1 overflow-hidden">
          {mapView ? (
            placesFailed ? (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-subtle">{t('tagCloud.unavailable')}</p>
            ) : !placeCounts ? (
              <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-subtle">
                {t('tagCloud.loading')}
              </p>
            ) : !placeTags.length ? (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-subtle">{needle ? t('tagCloud.noMatch') : t('tagCloud.none')}</p>
            ) : (
              // The map stretched to fill the panel, taller when there is room.
              <div className="absolute inset-0">
                <div className="relative size-full">
                  <svg aria-hidden viewBox={`0 0 ${WORLD_COLS} ${WORLD_ROWS}`} preserveAspectRatio="none" className="absolute inset-0 size-full fill-line/50">
                    <path d={WORLD_LAND_PATH} />
                  </svg>
                  <WordCloud tags={placeTags} selected={places} onToggle={onTogglePlace} onHot={onHot} shape="world" />
                </div>
              </div>
            )
          ) : failed && !baseline ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-subtle">{t('tagCloud.unavailable')}</p>
          ) : !counts && !baseline ? (
            <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-subtle">
              {t('tagCloud.loading')}
            </p>
          ) : !tags.length ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-subtle">{needle ? t('tagCloud.noMatch') : t('tagCloud.none')}</p>
          ) : (
            <WordCloud
              tags={tags}
              selected={cloudSelected}
              excluded={cloudExcluded}
              onToggle={onToggle}
              onHot={onHot}
            />
          )}
        </div>
        {/* One height whatever it says - two lines on a phone, one wider -
            so the cloud's box above it keeps its size as the pointer moves
            and across a pick, and its layout still fits the next page's. */}
        <p aria-live="polite" className="flex items-center border-t border-line px-5 py-2.5 text-xs text-subtle max-sm:px-3 max-sm:pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <span className="line-clamp-2 min-h-8 sm:line-clamp-1 sm:min-h-4">
            {mapView ? (
              hot ? (
                <>
                  <span className="font-semibold text-ink">{hot.name}</span> · {t('tagCloud.pins', { count: hot.count })} ·{' '}
                  {places.some((p) => p.toLowerCase() === hot.name.toLowerCase()) ? t('tagCloud.clickToDrop') : t('tagCloud.clickToAdd')}
                </>
              ) : (
                t('tagCloud.placeHint')
              )
            ) : hot ? (
              <>
                <span className="font-semibold text-ink">{tagLabel(t, hot)}</span>{' '}
                · {hot.members ? t('tagCloud.tags', { count: hot.members.length }) : t(KIND_LABEL[hot.kind])} · {t('tagCloud.pins', { count: hot.dim ? 0 : hot.count })} ·{' '}
                {selected.some((s) => s.toLowerCase() === hot.name.toLowerCase())
                  ? t('tagCloud.clickToExclude')
                  : excluded.some((s) => s.toLowerCase() === hot.name.toLowerCase())
                    ? t('tagCloud.clickToDrop')
                    : t('tagCloud.clickToAdd')}
                {hot.members ? ` · ${t('tagCloud.wraps', { names: `${hot.members.slice(0, 4).map((m) => m.name.replace(hot.name, '').trim() || m.name).join(', ')}${hot.members.length > 4 ? '…' : ''}` })}` : ''}
              </>
            ) : (
              t('tagCloud.hint')
            )}
          </span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
