'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FollowButton } from '@/components/pin/FollowButton';
import { CardGrid } from '@/components/pin/CardGrid';
import { PinCard } from '@/components/pin/PinCard';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { parseLinkHeader } from '@/lib/client/api';
import { safeHtmlInBrowser } from '@/lib/client/sanitize';
import { useManualScrollRestoration } from '@/lib/client/scrollRestoration';
import { useTodayHold } from '@/lib/client/todayHold';
import { loadSpecialtyDays } from '@/lib/client/specialtyDays';
import { useQueryState } from '@/lib/client/urlState';
import { useTimeZone } from '@/lib/client/timeZone';
import { dayKeyIn } from '@/lib/format';
import { DEFAULT_POSTED_WITHIN, EVENT_SPAN_OPTIONS, eventSpanSummary, formatSpan, offsetDate, SPAN_OPTIONS, spanLabel, spanToParam } from '@/lib/postedSpan';
import { TimelineVideoProvider } from '@/lib/client/timelineVideo';
import { buildBags, pinDayKey, pinTense, resolveTodayMarker, todayScrollId } from '@/lib/timeline';
import type { TimelineVideoSetting } from '@/lib/timelineVideo';
import type { CardPin, SearchPage } from '@/lib/types';
import { categoryPillSummary, SearchCategoryFilter } from './CategoryFilter';
import { FloatingControls } from './FloatingControls';
import { TimeBlock, TodayMarker } from './TimeBlock';
import { TimeRangeSlider } from './TimeRangeSlider';

type SortBy = 'date' | 'relevance';

const rail = "relative lg:before:absolute lg:before:top-0 lg:before:bottom-0 lg:before:left-[140px] lg:before:w-px lg:before:bg-rail lg:before:content-['']";

function SortToggle({ value, onChange, className = '' }: { value: SortBy; onChange: (value: SortBy) => void; className?: string }) {
  return (
    <div role="group" aria-label="Sort results by" className={`flex items-center gap-1 p-1.5 text-sm ${className}`}>
      <span className="px-2 text-subtle">Sort by</span>
      {(['relevance', 'date'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`flex-1 rounded-lg px-2.5 py-1 font-medium capitalize max-lg:py-2 transition-colors ${value === option ? 'bg-accent text-white' : 'text-muted hover:bg-raised hover:text-ink'}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

type Links = { previous?: string; next?: string };

// One sort's results so far: the pages loaded and the links on from them.
type ResultList = { pins: CardPin[]; links: Links; status: 'loading' | 'ready' | 'error' };

async function fetchSearchPage(query: string): Promise<{ pins: CardPin[]; links: Links }> {
  const res = await fetch(`/api/pins/search${query}`, { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(`search page failed: ${res.status}`);
  }
  const page = (await res.json()) as SearchPage;
  return {
    pins: page.pins.map((pin) => ({ ...pin, safeDescription: safeHtmlInBrowser(pin.description) })),
    links: parseLinkHeader(res.headers.get('link')),
  };
}

// Search results: on the timeline by date (opening on today), or as a grid
// ranked by relevance for free-text searches. Each arrives a page at a time:
// by date, earlier and later pages load as the reader nears either end; by
// relevance, the next best as they near the bottom. Each sort keeps its own
// pages, loaded the first time it shows.
export function SearchResults({
  initialPage,
  serverTimeZone,
  serverNow,
  searchedUser,
  specialtyDays: initialSpecialtyDays,
  error,
  query = '',
  onlyWatched = false,
  initialView = {},
  defaultSort = 'date',
  video,
}: {
  // The first page, for the sort the URL asked for.
  initialPage: { sort: SortBy; pins: CardPin[]; links: Links };
  serverTimeZone: string;
  serverNow: string;
  searchedUser?: { id: number; userName: string };
  specialtyDays: Record<string, string[]>;
  error?: string;
  query?: string;
  onlyWatched?: boolean;
  // The sort and filters as the URL had them.
  initialView?: { sort?: SortBy; postedWithin?: string | null; past?: string | null; future?: string | null };
  // The sort this search opens in without being asked: relevance for a search
  // with text in it, date for one that only filters. Only the other one is
  // written to the URL.
  defaultSort?: SortBy;
  // Whether a card here loads its video player on a phone (the admin setting).
  video: TimelineVideoSetting;
}) {
  const timeZone = useTimeZone(serverTimeZone);
  const [postedWithin, setPostedWithin] = useState<string | null>(initialView.postedWithin ?? DEFAULT_POSTED_WITHIN);
  // Any search can sort: a filter-only one (category:, user:) has no scores, so
  // by relevance it keeps date order but still gets the grid and start filter.
  const canSort = !!query.trim();
  const [sortBy, setSortBy] = useState<SortBy>(initialPage.sort);
  const [relevanceShown, setRelevanceShown] = useState(sortBy === 'relevance');
  // Relevance loses the timeline's sense of when, so it filters by start instead.
  const [startSpan, setStartSpan] = useState<{ past: string | null; future: string | null }>({ past: initialView.past ?? null, future: initialView.future ?? null });
  const [specialtyDays, setSpecialtyDays] = useState(initialSpecialtyDays);

  useQueryState({
    sort: sortBy === defaultSort ? null : sortBy,
    posted: spanToParam(postedWithin, DEFAULT_POSTED_WITHIN),
    past: spanToParam(startSpan.past, null),
    future: spanToParam(startSpan.future, null),
  });

  const [lists, setLists] = useState<Partial<Record<SortBy, ResultList>>>({
    [initialPage.sort]: { pins: initialPage.pins, links: initialPage.links, status: error ? 'error' : 'ready' },
  });
  // Bumped when a sort's results start over, so answers for the old ones are dropped.
  const loadToken = useRef<Record<SortBy, number>>({ date: 0, relevance: 0 });
  const busy = useRef(new Set<string>());
  const scrolled = useRef(false);
  const prependAnchor = useRef<{ height: number; top: number } | null>(null);

  const datePins = lists.date?.pins;
  const rankedPins = lists.relevance?.pins;
  const shown = lists[sortBy];

  // The filters are the server's to apply now, so a change starts the results
  // over: the sort on screen reloads, the other when it next shows.
  function reload(sort: SortBy, posted: string | null, span: typeof startSpan) {
    const token = ++loadToken.current[sort];
    if (sort === 'date') scrolled.current = false;
    setLists((current) => ({ ...current, [sort]: { pins: [], links: {}, status: 'loading' } }));
    const params = new URLSearchParams({ q: query, sort });
    if (onlyWatched) params.set('f', 'watch');
    if (posted) params.set('created_within', posted);
    if (sort === 'relevance' && span.past) params.set('start_past', span.past);
    if (sort === 'relevance' && span.future) params.set('start_future', span.future);
    fetchSearchPage(`?${params.toString()}`)
      .then(({ pins, links }) => {
        if (token === loadToken.current[sort]) setLists((current) => ({ ...current, [sort]: { pins, links, status: 'ready' } }));
      })
      .catch(() => {
        if (token === loadToken.current[sort]) setLists((current) => ({ ...current, [sort]: { pins: [], links: {}, status: 'error' } }));
      });
  }

  const changePostedWithin = (within: string | null) => {
    if (within === postedWithin) return;
    setPostedWithin(within);
    const other = sortBy === 'date' ? 'relevance' : 'date';
    loadToken.current[other]++;
    setLists((current) => ({ ...current, [other]: undefined }));
    reload(sortBy, within, startSpan);
  };

  const changeStartSpan = (span: typeof startSpan) => {
    setStartSpan(span);
    reload('relevance', postedWithin, span);
  };

  // The latest lists for loadMore, which an observer made a render ago can call.
  const listsRef = useRef(lists);
  useLayoutEffect(() => {
    listsRef.current = lists;
  }, [lists]);

  const loadMore = useCallback(
    async (sort: SortBy, direction: 'previous' | 'next') => {
      const query = listsRef.current[sort]?.links[direction];
      const key = `${sort}:${direction}`;
      if (!query || busy.current.has(key)) return;
      busy.current.add(key);
      const token = loadToken.current[sort];
      try {
        const page = await fetchSearchPage(query);
        if (token !== loadToken.current[sort] || listsRef.current[sort]?.links[direction] !== query) return;
        if (direction === 'previous') {
          prependAnchor.current = { height: document.documentElement.scrollHeight, top: window.scrollY };
        }
        setLists((current) => {
          const list = current[sort];
          if (!list || list.links[direction] !== query) return current;
          const have = new Set(list.pins.map((p) => p.id));
          const added = page.pins.filter((p) => !have.has(p.id));
          return {
            ...current,
            [sort]: {
              ...list,
              pins: direction === 'previous' ? [...added, ...list.pins] : [...list.pins, ...added],
              // A page with nothing new ends that way, rather than asking again.
              links: { ...list.links, [direction]: added.length ? page.links[direction] : undefined },
            },
          };
        });
      } catch {
        // Try again on the next scroll.
      } finally {
        busy.current.delete(key);
      }
    },
    // A new object each change, so the observer below is remade and checks
    // again whether a sentinel still shows once a page is in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists],
  );

  useEffect(() => {
    if (!datePins) return;
    const missing = datePins.some((pin) => !(pinDayKey(pin, timeZone).slice(5) in specialtyDays));
    if (missing) loadSpecialtyDays().then((all) => setSpecialtyDays(all));
  }, [datePins, specialtyDays, timeZone]);

  const todayKey = dayKeyIn(serverNow, timeZone);
  const bags = useMemo(() => buildBags(datePins ?? [], [], timeZone), [datePins, timeZone]);
  const marker = resolveTodayMarker(bags, todayKey);

  const scrollToToday = () => {
    const id = todayScrollId(bags, marker);
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  };
  // Opening and the Today button both hold today in place while the cards
  // above it finish growing.
  const holdToday = useTodayHold(scrollToToday);

  useLayoutEffect(() => {
    if (scrolled.current || sortBy !== 'date' || !bags.length) return;
    scrolled.current = true;
    holdToday();
  }, [bags, holdToday, sortBy]);
  // Each sort keeps its own place; relevance first opens at the top.
  const scrollBySort = useRef<Partial<Record<SortBy, number>>>({});
  const changeSort = (next: SortBy) => {
    if (next === sortBy) return;
    scrollBySort.current[sortBy] = window.scrollY;
    setSortBy(next);
    if (next === 'relevance') setRelevanceShown(true);
    if (!lists[next]) reload(next, postedWithin, startSpan);
  };
  const shownSort = useRef(sortBy);
  useLayoutEffect(() => {
    if (shownSort.current === sortBy) return;
    shownSort.current = sortBy;
    window.scrollTo({ top: scrollBySort.current[sortBy] ?? 0 });
  }, [sortBy]);
  // After the effects above, so the position it records on mount is today's.
  useManualScrollRestoration();

  // Keep the view still when a page is added above it.
  useLayoutEffect(() => {
    const anchor = prependAnchor.current;
    if (anchor) {
      prependAnchor.current = null;
      window.scrollTo({ top: anchor.top + (document.documentElement.scrollHeight - anchor.height) });
    }
  }, [datePins]);

  // Sentinels at the ends of the list on screen load the next page before the
  // reader gets there. A hidden list's sentinels never intersect.
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const rankedEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (entry.target === rankedEndRef.current) {
            void loadMore('relevance', 'next');
          } else if (scrolled.current) {
            void loadMore('date', entry.target === topRef.current ? 'previous' : 'next');
          }
        }
      },
      { rootMargin: '800px 0px' },
    );
    for (const ref of [topRef, bottomRef, rankedEndRef]) {
      if (ref.current) observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [loadMore, sortBy]);

  const phrase = (formatSpan(postedWithin) || '').replace(/^1 /, '');

  return (
    <TimelineVideoProvider setting={video}>
      <div className="px-3 pb-24 lg:px-4 xl:pr-[288px]">
        <FloatingControls
          summaryCaption={searchedUser ? undefined : 'Posted within'}
          summary={searchedUser ? searchedUser.userName : spanLabel(postedWithin)}
          summaryIsPostedWithin={!searchedUser}
          onToday={sortBy === 'date' && bags.length ? holdToday : undefined}
          sort={canSort ? <SortToggle value={sortBy} onChange={changeSort} className="floating max-xl:hidden" /> : undefined}
          category={{
            summary: categoryPillSummary(query),
            control: (
              <SearchCategoryFilter
                query={query}
                onlyWatched={onlyWatched}
                createdSince={postedWithin ? offsetDate(new Date(serverNow), postedWithin, -1)?.toISOString() : null}
              />
            ),
          }}
          span={
            sortBy === 'relevance'
              ? {
                  summary: eventSpanSummary(startSpan.past, startSpan.future),
                  control: <TimeRangeSlider steps={EVENT_SPAN_OPTIONS} past={startSpan.past} future={startSpan.future} onChange={changeStartSpan} />,
                }
              : undefined
          }
        >
          <TimeRangeSlider steps={SPAN_OPTIONS} past={postedWithin} pastOnly onChange={({ past }) => changePostedWithin(past)} />
          {searchedUser ? (
            <div className="floating flex flex-col gap-3 px-3.5 py-3">
              <div className="flex items-center gap-2 font-semibold text-ink">
                <UserAvatar userName={searchedUser.userName} className="size-7 text-sm" />
                {searchedUser.userName}
              </div>
              <FollowButton userId={searchedUser.id} userName={searchedUser.userName} showCount />
            </div>
          ) : null}
        </FloatingControls>

        {/* Narrower, the floating controls fold away; sorting is too important to
            hide with them, so it gets a bar of its own pinned under the navbar. */}
        {canSort ? (
          <div data-sticky-sort className="sticky top-[52px] z-20 -mx-3 flex justify-center bg-header/85 px-3 py-2 shadow-[0_1px_0_var(--color-line)] backdrop-blur-md lg:-mx-4 xl:hidden">
            <SortToggle value={sortBy} onChange={changeSort} className="w-full max-w-sm rounded-xl bg-field ring-1 ring-line ring-inset" />
          </div>
        ) : null}

        {shown?.status === 'loading' ? (
          <p className="mt-16 text-center text-lg text-subtle" role="status">
            Searching…
          </p>
        ) : null}
        {shown?.status === 'error' ? <p className="mt-16 text-center text-lg text-subtle">Search is unavailable right now. Please try again in a bit.</p> : null}
        {shown?.status === 'ready' && !shown.pins.length ? (
          <p className="mt-16 text-center text-lg text-subtle">
            {sortBy === 'relevance' && (startSpan.past || startSpan.future)
              ? 'No results start in this range.'
              : postedWithin
              ? `No results posted in the last ${phrase}.`
              : onlyWatched
                ? query.trim()
                  ? 'None of the pins you watch match this search.'
                  : "You aren't watching any pins yet. Tap the eye on a pin to watch it."
                : 'No results found, please try a different search'}
          </p>
        ) : null}

        {/* Kept mounted once shown: a remount resizes cards (embeds, media fallbacks) after the scroll is restored. */}
        {relevanceShown ? (
          <div hidden={sortBy !== 'relevance'}>
            <CardGrid className="mt-6">
              {(rankedPins ?? []).map((pin, i) => (
                <li key={pin.id} id={`rank-${pin.id}`}>
                  <PinCard pin={pin} serverTimeZone={serverTimeZone} priority={i === 0} tense={pinTense(pin, serverNow, todayKey)} />
                </li>
              ))}
            </CardGrid>
            <div ref={rankedEndRef} aria-hidden className="h-px" />
          </div>
        ) : null}
        <div ref={topRef} hidden={sortBy !== 'date'} aria-hidden className="h-px" />
        <div hidden={sortBy !== 'date'} className={rail}>
          {bags.map((bag, index) => (
            <div key={bag.day}>
              {marker.index === index ? <TodayMarker specialtyDays={specialtyDays[todayKey.slice(5)] || []} /> : null}
              <TimeBlock bag={bag} todayKey={todayKey} specialtyDays={specialtyDays[bag.day.slice(5)] || []} serverTimeZone={serverTimeZone} />
            </div>
          ))}
          {marker.atEnd ? <TodayMarker specialtyDays={specialtyDays[todayKey.slice(5)] || []} /> : null}
        </div>
        <div ref={bottomRef} hidden={sortBy !== 'date'} aria-hidden className="h-px" />
      </div>
    </TimelineVideoProvider>
  );
}
