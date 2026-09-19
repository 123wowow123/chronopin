'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FollowButton } from '@/components/pin/FollowButton';
import { CardGrid } from '@/components/pin/CardGrid';
import { PinCard } from '@/components/pin/PinCard';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { parseLinkHeader } from '@/lib/client/api';
import { type CardSpot, takeSearchSpot } from '@/lib/client/returnSpot';
import { safeHtmlInBrowser } from '@/lib/client/sanitize';
import { useManualScrollRestoration } from '@/lib/client/scrollRestoration';
import { useTodayHold } from '@/lib/client/todayHold';
import { loadSpecialtyDays } from '@/lib/client/specialtyDays';
import { useQueryState } from '@/lib/client/urlState';
import { useTimeZone } from '@/lib/client/timeZone';
import { daysBetween, dayKeyIn, monthDayOf } from '@/lib/format';
import { DEFAULT_POSTED_WITHIN, EVENT_SPAN_OPTIONS, eventSpanSummary, offsetDate, SPAN_OPTIONS, spanLabel, spanPhrase, spanToParam } from '@/lib/postedSpan';
import { TimelineVideoProvider } from '@/lib/client/timelineVideo';
import { buildBags, pinDayKey, pinTense, resolveTodayMarker, todayScrollId } from '@/lib/timeline';
import type { TimelineVideoSetting } from '@/lib/timelineVideo';
import type { CardPin, SearchPage } from '@/lib/types';
import { TagCloud, tagPillSummary } from './TagCloud';
import { FloatingControls } from './FloatingControls';
import { TimeBlock, TodayMarker } from './TimeBlock';
import { TimeRangeSlider } from './TimeRangeSlider';
import { useT } from '@/lib/client/i18n';
import { withPageLang } from '@/lib/client/navigation';

type SortBy = 'date' | 'relevance';

const rail = "relative lg:min-h-[calc(100dvh-52px-6rem)] lg:before:absolute lg:before:top-0 lg:before:-bottom-24 lg:before:left-[140px] lg:before:w-px lg:before:bg-rail lg:before:content-['']";

function SortToggle({ value, onChange, className = '' }: { value: SortBy; onChange: (value: SortBy) => void; className?: string }) {
  const t = useT();
  return (
    <div role="group" aria-label={t('search.sortResultsBy')} className={`flex items-center gap-1 p-1.5 text-sm ${className}`}>
      <span className="px-2 text-subtle">{t('search.sortBy')}</span>
      {(['relevance', 'date'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`flex-1 rounded-lg px-2.5 py-1 font-medium capitalize max-lg:py-2 transition-colors ${value === option ? 'bg-accent text-white' : 'text-muted hover:bg-raised hover:text-ink'}`}
        >
          {t(option === 'relevance' ? 'search.sortRelevance' : 'search.sortDate')}
        </button>
      ))}
    </div>
  );
}

type Links = { previous?: string; next?: string };

// How far results page toward the card left for logging in before giving up
// on it (24 results a page).
const MAX_RETURN_PAGES = 40;

// One sort's results so far: the pages loaded and the links on from them.
type ResultList = { pins: CardPin[]; links: Links; status: 'loading' | 'ready' | 'error' };

async function fetchSearchPage(query: string): Promise<{ pins: CardPin[]; links: Links }> {
  const res = await fetch(withPageLang(`/api/pins/search${query}`), { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(`search page failed: ${res.status}`);
  }
  const page = (await res.json()) as SearchPage;
  return {
    pins: page.pins.map((pin) => ({ ...pin, safeDescription: safeHtmlInBrowser(pin.description) })),
    links: parseLinkHeader(res.headers.get('link')),
  };
}

const NO_TODAY_MARKER: ReturnType<typeof resolveTodayMarker> = { index: -1, atEnd: false, todayBagIndex: -1 };

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
  searchedDays = [],
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
  // The days a date: search keeps to; today is on the timeline only when it is one of them.
  searchedDays?: string[];
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
  const t = useT();
  const [postedWithin, setPostedWithin] = useState<string | null>(initialView.postedWithin ?? DEFAULT_POSTED_WITHIN);
  // Any search can sort: a filter-only one (tag:, user:) has no scores, so
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

  // Whether a page went in: false when there is none or it failed, null when
  // that page is already loading or its list started over meanwhile.
  const loadMore = useCallback(
    async (sort: SortBy, direction: 'previous' | 'next'): Promise<boolean | null> => {
      const query = listsRef.current[sort]?.links[direction];
      const key = `${sort}:${direction}`;
      if (!query) return false;
      if (busy.current.has(key)) return null;
      busy.current.add(key);
      const token = loadToken.current[sort];
      try {
        const page = await fetchSearchPage(query);
        if (token !== loadToken.current[sort] || listsRef.current[sort]?.links[direction] !== query) return null;
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
        return true;
      } catch {
        // Try again on the next scroll.
        return false;
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
    const missing = datePins.some((pin) => !(monthDayOf(pinDayKey(pin, timeZone)) in specialtyDays));
    if (missing) loadSpecialtyDays().then((all) => setSpecialtyDays(all));
  }, [datePins, specialtyDays, timeZone]);

  const todayKey = dayKeyIn(serverNow, timeZone);
  const bags = useMemo(() => buildBags(datePins ?? [], [], timeZone), [datePins, timeZone]);
  // Today only where the results cross it: some on or before it and some on
  // or after it, loaded or on a page still to come. Results all on one side
  // (a past award's winners) have no today in them.
  const dateLinks = lists.date?.links;
  const crossesToday =
    !!bags.length &&
    (daysBetween(bags[0].day, todayKey) >= 0 || !!dateLinks?.previous) &&
    (daysBetween(todayKey, bags[bags.length - 1].day) >= 0 || !!dateLinks?.next);
  const showsToday = crossesToday && (!searchedDays.length || searchedDays.includes(todayKey));
  const marker = showsToday ? resolveTodayMarker(bags, todayKey) : NO_TODAY_MARKER;

  const scrollToToday = () => {
    const id = todayScrollId(bags, marker);
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  };
  // Opening and the Today button both hold today in place while the cards
  // above it finish growing.
  const holdToday = useTodayHold(scrollToToday);

  // Back from logging in: the card the reader left, paged toward while the
  // results stay hidden, then put back as far down the window as it was and
  // held there like today.
  const returnTo = useRef<CardSpot | null>(null);
  const heldSpot = useRef<CardSpot | null>(null);
  const [restoring, setRestoring] = useState(false);
  const holdSpot = useTodayHold(() => {
    const spot = heldSpot.current;
    const el = spot && document.getElementById(`${sortBy === 'date' ? 'pin' : 'rank'}-${spot.pinId}`);
    if (el) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - spot.top });
  });
  const spotTaken = useRef(false);
  const pagesWalked = useRef(0);
  // The sort the page opened in (only the first layout pass reads it).
  const openedSort = useRef(sortBy);
  useLayoutEffect(() => {
    if (spotTaken.current) return;
    spotTaken.current = true;
    const spot = takeSearchSpot();
    // A new search by relevance starts at its best match. The router keeps
    // the window where it was when only the query changes, so a search made
    // from further down the last results would open part-way down the new
    // ones. (By date it opens on today, below; a page shown again after Back
    // is not a new mount and keeps its place.)
    if (!spot && openedSort.current === 'relevance') window.scrollTo({ top: 0 });
    if (!spot || error) return;
    returnTo.current = spot;
    // Not today: by date, the opening below stands aside and the sentinels may page.
    scrolled.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidden before the first paint after hydration
    setRestoring(true);
  }, [error]);

  useEffect(() => {
    const spot = returnTo.current;
    const list = lists[sortBy];
    if (!spot || !list || list.status === 'loading') return;
    const finish = (found: boolean) => {
      returnTo.current = null;
      setRestoring(false);
      if (found) {
        heldSpot.current = spot;
        holdSpot();
      } else if (sortBy === 'date') {
        holdToday();
      }
    };
    if (list.pins.some((pin) => pin.id === spot.pinId)) return finish(true);
    // By relevance the card is further down; by date, beyond whichever end
    // its start is past (within the dates loaded, it has gone).
    let direction: 'previous' | 'next' | null = 'next';
    if (sortBy === 'date' && list.pins.length) {
      const at = new Date(spot.start ?? NaN).getTime();
      const first = new Date(list.pins[0].utcStartDateTime).getTime();
      const last = new Date(list.pins[list.pins.length - 1].utcStartDateTime).getTime();
      direction = at <= first ? 'previous' : at >= last ? 'next' : null;
    }
    if (list.status === 'error' || !direction || !list.links[direction] || pagesWalked.current >= MAX_RETURN_PAGES) return finish(false);
    void loadMore(sortBy, direction).then((added) => {
      if (added) pagesWalked.current++;
      else if (added === false && returnTo.current === spot) finish(false);
    });
  }, [lists, sortBy, loadMore, holdSpot, holdToday]);

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

  const phrase = spanPhrase(postedWithin, t.locale);

  return (
    <TimelineVideoProvider setting={video}>
      <div className="px-3 pb-24 lg:px-4 xl:pr-[288px]">
        <FloatingControls
          summaryCaption={searchedUser ? undefined : t('controls.postedWithin')}
          summary={searchedUser ? searchedUser.userName : spanLabel(postedWithin, t.locale)}
          summaryIsPostedWithin={!searchedUser}
          onToday={sortBy === 'date' && bags.length && showsToday ? holdToday : undefined}
          sort={canSort ? <SortToggle value={sortBy} onChange={changeSort} className="floating max-xl:hidden" /> : undefined}
          tags={{
            summary: tagPillSummary(query, t.locale),
            control: (
              <TagCloud
                query={query}
                onlyWatched={onlyWatched}
                createdSince={postedWithin ? offsetDate(new Date(serverNow), postedWithin, -1)?.toISOString() : null}
              />
            ),
          }}
          span={
            sortBy === 'relevance'
              ? {
                  summary: eventSpanSummary(startSpan.past, startSpan.future, t.locale),
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

        {shown?.status === 'loading' || restoring ? (
          <p className="mt-16 text-center text-lg text-subtle" role="status">
            {t('search.searching')}
          </p>
        ) : null}
        {shown?.status === 'error' ? <p className="mt-16 text-center text-lg text-subtle">{t('search.unavailable')}</p> : null}
        {shown?.status === 'ready' && !shown.pins.length ? (
          <p className="mt-16 text-center text-lg text-subtle">
            {sortBy === 'relevance' && (startSpan.past || startSpan.future)
              ? t('search.noneInRange')
              : postedWithin
              ? t('search.nonePosted', { span: phrase })
              : onlyWatched
                ? query.trim()
                  ? t('search.noneWatchedMatch')
                  : t('search.noneWatched')
                : t('search.noResults')}
          </p>
        ) : null}

        {/* Kept mounted once shown: a remount resizes cards (embeds, media fallbacks) after the scroll is restored. */}
        {relevanceShown ? (
          <div hidden={sortBy !== 'relevance'} className={restoring ? 'invisible' : undefined}>
            <CardGrid className="mt-6">
              {(rankedPins ?? []).map((pin, i) => (
                <li key={pin.id} id={`rank-${pin.id}`}>
                  <PinCard pin={pin} serverTimeZone={serverTimeZone} priority={i === 0} tense={pinTense(pin, serverNow, todayKey)} todayKey={todayKey} />
                </li>
              ))}
            </CardGrid>
            <div ref={rankedEndRef} aria-hidden className="h-px" />
          </div>
        ) : null}
        <div ref={topRef} hidden={sortBy !== 'date'} aria-hidden className="h-px" />
        <div hidden={sortBy !== 'date'} className={`${rail} ${restoring ? 'invisible' : ''}`}>
          {bags.map((bag, index) => (
            <div key={bag.day}>
              {marker.index === index ? <TodayMarker specialtyDays={specialtyDays[monthDayOf(todayKey)] || []} /> : null}
              <TimeBlock bag={bag} todayKey={todayKey} specialtyDays={specialtyDays[monthDayOf(bag.day)] || []} serverTimeZone={serverTimeZone} />
            </div>
          ))}
          {marker.atEnd ? <TodayMarker specialtyDays={specialtyDays[monthDayOf(todayKey)] || []} /> : null}
        </div>
        <div ref={bottomRef} hidden={sortBy !== 'date'} aria-hidden className="h-px" />
      </div>
    </TimelineVideoProvider>
  );
}
