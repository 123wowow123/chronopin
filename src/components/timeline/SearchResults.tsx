'use client';

import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FollowButton } from '@/components/pin/FollowButton';
import { UserMenu } from '@/components/pin/UserMenu';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CardGrid } from '@/components/pin/CardGrid';
import { PinCard } from '@/components/pin/PinCard';
import { useBlocks } from '@/lib/client/blocks';
import { useLeftOut } from '@/lib/client/leftOut';
import { useSession } from '@/lib/client/session';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { BackToTimeline } from './BackToTimeline';
import { parseLinkHeader } from '@/lib/client/api';
import { createPageAhead } from '@/lib/client/pageAhead';
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
import type { CardPin, SearchedCompany, SearchPage } from '@/lib/types';
import { CompanyProductsPanel } from './CompanyProducts';
import { SearchedCompanyPanel } from './SearchedCompany';
import { TagCloud, tagPillSummary } from './TagCloud';
import { FloatingControls } from './FloatingControls';
import { TimeBlock, TodayMarker } from './TimeBlock';
import { TimeRangeSlider } from './TimeRangeSlider';
import { useT } from '@/lib/client/i18n';
import { withPageLang } from '@/lib/client/navigation';
import type { SpecialtyDay } from '@/lib/specialtyDays';

type SortBy = 'date' | 'relevance';

const rail = "relative lg:min-h-[calc(100dvh-52px-6rem)] lg:before:absolute lg:before:top-0 lg:before:-bottom-24 lg:before:left-[140px] lg:before:w-px lg:before:bg-rail lg:before:content-['']";

// How the results are sorted, as a segmented control. `compact` is the one in
// the bottom left of a phone's screen, and it is built to the "Today" button
// opposite it (TodayBar in FloatingControls): the same floating panel, the
// same 44px capsule, the same medium ink text at px-3 - so the two corners
// read as one row of controls rather than two designs. It carries no caption:
// two words that say what they do need none, and a phone's row has no width
// to spare for one. Its options fill the capsule's height, so the one in use
// is a thumb slid under the word rather than a button inside a box.
// What each sort is: the best matches first, or the timeline's own order.
// Coloured as "Today" beside it colours its target, and in the bottom row's
// own language - the timeline icon is the future blue the span pill gives it.
// On the chosen option they lie on the accent and take its white.
const SORT_ICON = {
  relevance: { name: 'sparkle', className: 'text-link' },
  date: { name: 'timeline', className: 'text-future' },
} as const satisfies Record<SortBy, { name: IconName; className: string }>;

function SortToggle({ value, onChange, compact = false, className = '' }: { value: SortBy; onChange: (value: SortBy) => void; compact?: boolean; className?: string }) {
  const t = useT();
  const option = (chosen: boolean) =>
    compact
      ? `flex items-center gap-1.5 self-stretch rounded-full px-3 font-medium transition-colors ${chosen ? 'bg-accent text-white' : 'text-ink hover:bg-raised'}`
      : // Tighter than the floating one: with the caption beside them, both
        // options and their icons have a 16rem column to fit into.
        `flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1 font-medium capitalize max-lg:py-2 transition-colors ${chosen ? 'bg-accent text-white' : 'text-muted hover:bg-raised hover:text-ink'}`;
  return (
    <div
      role="group"
      aria-label={t('search.sortResultsBy')}
      className={`flex items-center text-sm ${compact ? 'h-11 min-w-0 gap-1 rounded-full p-1' : 'gap-1 p-1.5'} ${className}`}
    >
      {compact ? null : <span className="px-2 whitespace-nowrap text-subtle">{t('search.sortBy')}</span>}
      {(['relevance', 'date'] as const).map((sort) => (
        <button key={sort} type="button" aria-pressed={value === sort} onClick={() => onChange(sort)} className={option(value === sort)}>
          {/* On a 320px screen the two words alone leave "Today" opposite
              them its room; the icons go rather than crowd it. */}
          <Icon name={SORT_ICON[sort].name} className={`size-4 shrink-0 ${compact ? 'max-[359px]:hidden' : ''} ${value === sort ? '' : SORT_ICON[sort].className}`} />
          {t(sort === 'relevance' ? 'search.sortRelevance' : 'search.sortDate')}
        </button>
      ))}
    </div>
  );
}

type Links = { previous?: string; next?: string };

// How far results page toward the card left for logging in before giving up
// on it (24 results a page).
const MAX_RETURN_PAGES = 40;

// How near the foot of the page counts as having reached it - the same reach
// the sentinels are given below them.
const NEAR_FOOT_PX = 800;

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
  searchedCompany,
  specialtyDays: initialSpecialtyDays,
  searchedDays = [],
  error,
  query = '',
  onlyWatched = false,
  initialView = {},
  defaultSort = 'date',
  video,
  sliderTyping = false,
  tagList = false,
}: {
  // The first page, for the sort the URL asked for.
  initialPage: { sort: SortBy; pins: CardPin[]; links: Links };
  serverTimeZone: string;
  serverNow: string;
  searchedUser?: { id: number; userName: string };
  // The one company a company: search names, for the panel about it.
  searchedCompany?: SearchedCompany;
  specialtyDays: Record<string, SpecialtyDay[]>;
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
  // Whether the filter sliders offer a typed box (the admin setting).
  sliderTyping?: boolean;
  // The admin setting: whether the tag panel lists its tags, or opens the big cloud.
  tagList?: boolean;
}) {
  const timeZone = useTimeZone(serverTimeZone);
  const t = useT();
  const blocks = useBlocks();
  const leftOut = useLeftOut();
  const { user } = useSession();
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
  // Pages fetched ahead of the reader (src/lib/client/pageAhead.ts).
  const [ahead] = useState(() => createPageAhead(fetchSearchPage));
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
    ahead.clear();
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
  // The page past each end of the list on screen, fetched as soon as its
  // link is known.
  useEffect(() => {
    const links = lists[sortBy]?.links;
    ahead.warm(links?.next);
    ahead.warm(links?.previous);
  }, [ahead, lists, sortBy]);

  const loadMore = useCallback(
    async (sort: SortBy, direction: 'previous' | 'next'): Promise<boolean | null> => {
      const query = listsRef.current[sort]?.links[direction];
      const key = `${sort}:${direction}`;
      if (!query) return false;
      if (busy.current.has(key)) return null;
      busy.current.add(key);
      const token = loadToken.current[sort];
      try {
        const page = await ahead.take(query);
        if (token !== loadToken.current[sort] || listsRef.current[sort]?.links[direction] !== query) return null;
        if (direction === 'previous') {
          prependAnchor.current = { height: document.documentElement.scrollHeight, top: window.scrollY };
        }
        // Added below the reader, out of sight: drawn as a transition, which
        // gives way to their scrolling. Added above, at once, so the view is
        // held still from the position just read.
        (direction === 'next' ? startTransition : (add: () => void) => add())(() => setLists((current) => {
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
        }));
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

  const scrollTo = (id: string | null) => {
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  };
  // Where now falls among the results: today itself where they reach it, and
  // otherwise the day nearest it - the first one still to come, or the last
  // one behind us. Results on one side of today (a finished tour, a past
  // award) and searches pinned to other days (date:) have no today to show,
  // but the reader still asked to be taken back to now.
  const nowScrollId = () => {
    const id = todayScrollId(bags, marker);
    if (id || !bags.length) return id;
    const ahead = bags.findIndex((bag) => daysBetween(todayKey, bag.day) > 0);
    return `day-${(ahead === -1 ? bags[bags.length - 1] : bags[ahead]).day}`;
  };
  // Opening holds today in place while the cards above it finish growing, and
  // stands aside where the results never reach today: those open at the first
  // of them, as they always have.
  const holdToday = useTodayHold(() => scrollTo(todayScrollId(bags, marker)));
  // The Today button holds the same way, with somewhere to go either way.
  const holdNow = useTodayHold(() => scrollTo(nowScrollId()));

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
      { rootMargin: '2500px 0px' },
    );
    for (const ref of [topRef, bottomRef, rankedEndRef]) {
      if (ref.current) observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [loadMore, sortBy]);

  // A sentinel can end up somewhere it will never be seen. What follows the
  // list - the footer and the panels under it - is taller than the window, so
  // with the page at its foot the end of the list stands above the window and
  // past the margin above, where nothing is left to intersect: the results
  // dead-ended with pages still to come, and no scroll could ask for them.
  // The foot of the page says what the end sentinel says, so it asks too.
  // loadMore answers for itself when there is no page to come, or one is
  // already on its way.
  useEffect(() => {
    const onScroll = () => {
      if (sortBy === 'date' && !scrolled.current) return;
      if (document.documentElement.scrollHeight - (window.scrollY + window.innerHeight) <= NEAR_FOOT_PX) void loadMore(sortBy, 'next');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // A list too short to fill the window sends no scroll of its own.
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [loadMore, sortBy]);

  const phrase = spanPhrase(postedWithin, t.locale);

  return (
    <TimelineVideoProvider setting={video}>
      <div className="px-3 pb-24 lg:px-4 xl:pr-[288px]">
        <FloatingControls
          merge
          typing={sliderTyping}
          tagList={tagList}
          filterSummary={spanLabel(postedWithin, t.locale)}
          summaryCaption={searchedUser || searchedCompany ? undefined : t('controls.postedWithin')}
          summary={searchedUser ? searchedUser.userName : searchedCompany ? searchedCompany.name : spanLabel(postedWithin, t.locale)}
          summaryIsPostedWithin={!searchedUser && !searchedCompany}
          onToday={sortBy === 'date' && bags.length ? holdNow : undefined}
          sort={canSort ? <SortToggle value={sortBy} onChange={changeSort} className="floating max-xl:hidden" /> : undefined}
          // The sort to hand below xl; from xl it is in the panel.
          bottom={canSort ? <SortToggle compact value={sortBy} onChange={changeSort} className="floating xl:hidden" /> : undefined}
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
                  control: <TimeRangeSlider steps={EVENT_SPAN_OPTIONS} past={startSpan.past} future={startSpan.future} collapsible onChange={changeStartSpan} />,
                }
              : undefined
          }
          cards={
            searchedUser || searchedCompany ? (
              <>
                {searchedUser ? (
                  <div className="floating flex flex-col gap-3 px-4 py-3.5">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      <UserAvatar userName={searchedUser.userName} className="size-7 text-sm" />
                      <span className="min-w-0 flex-1 truncate">{searchedUser.userName}</span>
                      {/* Block and Unblock, for a signed-in reader on someone else. */}
                      {user && user.id !== searchedUser.id ? (
                        <span className="-my-1 -mr-2">
                          <UserMenu
                            user={{ id: searchedUser.id, userName: searchedUser.userName, pictureUrl: null }}
                            blocked={blocks.ids.has(searchedUser.id)}
                          />
                        </span>
                      ) : null}
                    </div>
                    {/* Blocking ends a follow and keeps a new one from starting, so
                        the button gives way to what is so (and, back after an
                        unblock, reads the counts afresh). */}
                    {blocks.ids.has(searchedUser.id) ? (
                      <p className="text-sm text-muted">{t('profile.blocked')}</p>
                    ) : (
                      <FollowButton userId={searchedUser.id} userName={searchedUser.userName} showCount />
                    )}
                  </div>
                ) : null}
                {searchedCompany ? <SearchedCompanyPanel company={searchedCompany} /> : null}
                {searchedCompany?.sentiment ? <CompanyProductsPanel name={searchedCompany.name} sentiment={searchedCompany.sentiment} /> : null}
              </>
            ) : undefined
          }
        >
          <TimeRangeSlider steps={SPAN_OPTIONS} past={postedWithin} pastOnly collapsible onChange={({ past }) => changePostedWithin(past)} />
        </FloatingControls>

        {/* The way back to the timeline, where "View all" opened this day:
            top left, riding under the header as the day scrolls. */}
        <BackToTimeline className="sticky top-[60px] z-20 mb-2 w-fit" />

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
              {/* Pins by anyone the reader blocked, or that they are not interested in, are left out. */}
              {(rankedPins ?? []).filter((pin) => !leftOut(pin)).map((pin, i) => (
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
              {marker.index === index ? <TodayMarker day={todayKey} specialtyDays={specialtyDays[monthDayOf(todayKey)] || []} /> : null}
              <TimeBlock bag={bag} todayKey={todayKey} specialtyDays={specialtyDays[monthDayOf(bag.day)] || []} serverTimeZone={serverTimeZone} />
            </div>
          ))}
          {marker.atEnd ? <TodayMarker day={todayKey} specialtyDays={specialtyDays[monthDayOf(todayKey)] || []} /> : null}
        </div>
        <div ref={bottomRef} hidden={sortBy !== 'date'} aria-hidden className="h-px" />
      </div>
    </TimelineVideoProvider>
  );
}
