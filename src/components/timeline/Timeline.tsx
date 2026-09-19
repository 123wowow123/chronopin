'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { parseLinkHeader } from '@/lib/client/api';
import { onLive } from '@/lib/client/liveFeed';
import { useNow } from '@/lib/client/now';
import { safeHtmlInBrowser } from '@/lib/client/sanitize';
import { useManualScrollRestoration } from '@/lib/client/scrollRestoration';
import { loadSpecialtyDays } from '@/lib/client/specialtyDays';
import { takeTimelineSpot } from '@/lib/client/returnSpot';
import { useTodayHold } from '@/lib/client/todayHold';
import { useQueryState } from '@/lib/client/urlState';
import { browserTimeZone, useTimeZone } from '@/lib/client/timeZone';
import { daysBetween, dayKeyIn, monthDayOf } from '@/lib/format';
import { DEFAULT_POSTED_WITHIN, formatSpan, SPAN_OPTIONS, spanLabel, spanToParam } from '@/lib/postedSpan';
import { pinMarketRefs } from '@/lib/predictionMarkets';
import { pinConfidence, pinEvidence } from '@/lib/referenceConfidence';
import { TimelineVideoProvider } from '@/lib/client/timelineVideo';
import { buildBags, pinDayKey, resolveTodayMarker, todayScrollId } from '@/lib/timeline';
import type { TimelineVideoSetting } from '@/lib/timelineVideo';
import type { CardPin, DateTimeJson, NewPin, TimelinePage, TrendingPin } from '@/lib/types';
import { categoryPillSummary, SearchCategoryFilter } from './CategoryFilter';
import { FloatingControls } from './FloatingControls';
import { NewPins } from './NewPins';
import { TimeBlock, TodayMarker } from './TimeBlock';
import { TimeRangeSlider } from './TimeRangeSlider';
import { TrendingPins } from './TrendingPins';

type Links = { previous?: string; next?: string };

// How many pins the new pins panel keeps, matching the LIMIT newPins() in
// src/server/services/pages.ts asks for.
const NEW_PINS_LIMIT = 5;

// How long a burst of live pin changes is let settle before the days at
// either end of the loaded stretch are counted again.
const RECOUNT_DELAY_MS = 500;

// The medium a broadcast pin shows in the new pins panel: a video's still
// first, else the earliest-attached medium (mirrors PinView.pictures' SQL
// and the same choice made client-side in PinsMap.tsx's popupContent).
function toNewPin(pin: CardPin): NewPin {
  const medium = pin.media?.find((m) => String(m.type) === '3') ?? pin.media?.[0];
  return {
    id: pin.id,
    title: pin.title,
    userName: pin.user?.userName ?? null,
    // A just-saved broadcast carries no utcCreatedDateTime (PinCard.tsx
    // guards the same gap); it was created now, so that is the best answer.
    utcCreatedDateTime: pin.utcCreatedDateTime ?? new Date().toISOString(),
    thumbName: medium?.thumbName,
    originalUrl: medium && String(medium.type) === '1' ? medium.originalUrl : undefined,
    hasMarket: pinMarketRefs(pin).length > 0,
  };
}

// The pin a timeline opened on (the pin page's "To timeline"): the timeline
// starts there, centred, rather than on today.
type Focus = { id: number; utcStartDateTime: string; allDay?: boolean };

const NO_TODAY_MARKER: ReturnType<typeof resolveTodayMarker> = { index: -1, atEnd: false, todayBagIndex: -1 };

async function fetchPage(query: string): Promise<{ page: TimelinePage; links: Links }> {
  const res = await fetch(`/api/main${query}`, { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(`timeline page failed: ${res.status}`);
  }
  const page = (await res.json()) as TimelinePage;
  page.pins = page.pins.map((pin) => ({ ...pin, safeDescription: safeHtmlInBrowser(pin.description) }));
  return { page, links: parseLinkHeader(res.headers.get('link')) };
}

// How many pins one day really has, loaded or not.
async function fetchDayCount(day: string, timeZone: string, postedWithin: string | null): Promise<number> {
  const params = new URLSearchParams({ day, tz: timeZone });
  if (postedWithin) params.set('created_within', postedWithin);
  const res = await fetch(`/api/main/day?${params}`, { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(`timeline day count failed: ${res.status}`);
  }
  return ((await res.json()) as { count: number }).count;
}

// The home timeline: the first page arrives server-rendered; earlier and later
// pages load as the reader scrolls toward either end.
export function Timeline({
  focus,
  initialPins,
  initialDateTimes,
  initialLinks,
  serverTimeZone,
  initialPostedWithin,
  defaultPostedWithin,
  defaultSpan,
  initialSpecialtyDays,
  serverNow,
  minConfidence,
  video,
  trending,
  newPins: initialNewPins,
}: {
  focus: Focus | null;
  initialPins: CardPin[];
  initialDateTimes: DateTimeJson[];
  initialLinks: Links;
  serverTimeZone: string;
  initialPostedWithin: string | null;
  // The viewer's saved preference (or the site default): left out of the URL.
  defaultPostedWithin: string | null;
  defaultSpan: string;
  initialSpecialtyDays: Record<string, string[]>;
  // When the server rendered, so "today" matches during hydration.
  serverNow: string;
  // The score a pin needs to show (the admin setting), or null to show every pin.
  minConfidence: number | null;
  // Whether a card here loads its video player on a phone (the admin setting).
  video: TimelineVideoSetting;
  // The most viewed pins with rising views, beside the cards on wide screens.
  trending: { pins: TrendingPin[]; days: number };
  // The pins added most recently, under trending on wide screens. Kept live
  // from the same SSE stream as the timeline itself, so a new pin appears
  // here without a reload or any polling of its own.
  newPins: NewPin[];
}) {
  const timeZone = useTimeZone(serverTimeZone);
  const [pins, setPins] = useState(initialPins);
  const [newPins, setNewPins] = useState(initialNewPins);
  const [dateTimes, setDateTimes] = useState(initialDateTimes);
  const [links, setLinks] = useState(initialLinks);
  const [postedWithin, setPostedWithin] = useState(initialPostedWithin);
  useQueryState({ posted: spanToParam(postedWithin, defaultPostedWithin) });
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('ready');
  // Bumped when pins are added, edited or removed, so the days at either end
  // of the loaded stretch are counted again: any change may have moved a pin
  // into or out of one.
  const [countsVersion, setCountsVersion] = useState(0);
  const [specialtyDays, setSpecialtyDays] = useState(initialSpecialtyDays);
  // Ticks each minute, so "today" rolls over at midnight.
  const now = useNow(60_000, new Date(serverNow).getTime());

  const loadToken = useRef(0);
  const busy = useRef({ previous: false, next: false });
  const scrolledToToday = useRef(false);
  const prependAnchor = useRef<{ height: number; top: number } | null>(null);

  const todayKey = dayKeyIn(now, timeZone);
  const bags = useMemo(() => buildBags(pins, dateTimes, timeZone), [pins, dateTimes, timeZone]);
  // Opened on a pin far from today, the pages loaded may not reach it yet: no
  // TODAY marker at the edge of that stretch until they do. A timeline opened
  // on today always reaches it.
  const reachesToday =
    !focus ||
    (bags.length > 0 &&
      (daysBetween(bags[0].day, todayKey) >= 0 || !links.previous) &&
      (daysBetween(todayKey, bags[bags.length - 1].day) >= 0 || !links.next));
  const marker = reachesToday ? resolveTodayMarker(bags, todayKey) : NO_TODAY_MARKER;
  const router = useRouter();

  useEffect(() => {
    if (bags.some((bag) => !(monthDayOf(bag.day) in specialtyDays))) {
      loadSpecialtyDays().then((all) => setSpecialtyDays(all));
    }
  }, [bags, specialtyDays]);

  const scrollToToday = useCallback(() => {
    const id = todayScrollId(bags, resolveTodayMarker(bags, dayKeyIn(Date.now(), timeZone)));
    const el = id && document.getElementById(id);
    if (el) {
      el.scrollIntoView({ block: 'start' });
    }
  }, [bags, timeZone]);

  // Opening and the Today button both hold today in place while the cards
  // above it finish growing.
  const holdToday = useTodayHold(scrollToToday);

  // The focused pin's card, or its day when the card is not drawn (hidden in
  // a duplicate stack, or filtered out).
  const focusTarget = useCallback(
    () => (focus ? (document.getElementById(`pin-${focus.id}`) ?? document.getElementById(`day-${pinDayKey(focus, timeZone)}`)) : null),
    [focus, timeZone],
  );
  // Back from logging in: how far down the window the focused card was.
  const spotTop = useRef<number | null>(null);
  const scrollToFocus = useCallback(() => {
    const el = focusTarget();
    if (el && spotTop.current !== null && el.id === `pin-${focus?.id}`) {
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - spotTop.current });
      return;
    }
    // In the middle of the window, unless it is too tall to fit there. Only as
    // near as the page scrolls: near either end of the timeline it stops short.
    el?.scrollIntoView({ block: el.offsetHeight > window.innerHeight * 0.8 ? 'start' : 'center' });
  }, [focus, focusTarget]);
  // Held the same way as today, while the cards above it grow.
  const holdFocus = useTodayHold(scrollToFocus);
  const flashed = useRef(false);

  // Open on the focused pin, or on today, once the first page is on screen.
  useLayoutEffect(() => {
    if (scrolledToToday.current || !bags.length) return;
    scrolledToToday.current = true;
    const target = focusTarget();
    if (!target) {
      holdToday();
      return;
    }
    spotTop.current = focus ? takeTimelineSpot(focus.id) : null;
    holdFocus();
    // Put back where the reader left it, the card needs no pointing out.
    if (spotTop.current !== null) return;
    // A moment's outline, so the eye lands on the card it came back to.
    const card = target.querySelector('article');
    if (card && !flashed.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      flashed.current = true;
      const ring = getComputedStyle(document.documentElement).getPropertyValue('--color-link').trim();
      // Delayed and long enough to outlast the page still loading around it.
      card.animate(
        [{ boxShadow: `0 0 0 3px ${ring}` }, { boxShadow: `0 0 0 3px ${ring}`, offset: 0.65 }, { boxShadow: '0 0 0 3px transparent' }],
        { duration: 3000, delay: 300, easing: 'ease-out' },
      );
    }
  }, [bags, focus, focusTarget, holdFocus, holdToday]);

  // Today is not among the pages loaded (the timeline opened on a pin far from
  // it): open the timeline on today instead, keeping the posting window.
  const goToToday = useCallback(() => {
    if (reachesToday) {
      holdToday();
      return;
    }
    const posted = spanToParam(postedWithin, defaultPostedWithin);
    router.push(posted ? `/?posted=${encodeURIComponent(posted)}` : '/');
  }, [reachesToday, holdToday, postedWithin, defaultPostedWithin, router]);
  // After the effect above, so the position it records on mount is today's.
  useManualScrollRestoration();

  // Keep the view still when a page is added above it.
  useLayoutEffect(() => {
    const anchor = prependAnchor.current;
    if (anchor) {
      prependAnchor.current = null;
      window.scrollTo({ top: anchor.top + (document.documentElement.scrollHeight - anchor.height) });
    }
  }, [pins, dateTimes]);

  const merge = useCallback((page: TimelinePage) => {
    setPins((current) => {
      const byId = new Map(current.map((p) => [p.id, p]));
      page.pins.forEach((p) => byId.set(p.id, p));
      return [...byId.values()];
    });
    setDateTimes((current) => {
      const byId = new Map(current.map((d) => [d.id, d]));
      page.dateTimes.forEach((d) => byId.set(d.id, d));
      return [...byId.values()];
    });
  }, []);

  // Live changes from other people (new pins, edits, watch counts), for pins
  // within the stretch of timeline already loaded and the new pins panel, over
  // the page's one live stream.
  useEffect(() => {
    // A burst of changes (a scrape adding a dozen pins) asks for counts once.
    let recount: ReturnType<typeof setTimeout> | undefined;
    const onPin = (type: string, changed: CardPin) => {
      if (type === 'pin:save' || type === 'pin:update' || type === 'pin:remove') {
        clearTimeout(recount);
        recount = setTimeout(() => setCountsVersion((v) => v + 1), RECOUNT_DELAY_MS);
      }
      const withHtml = { ...changed, safeDescription: safeHtmlInBrowser(changed.description) };
      // A pin edited below the timeline's confidence bar leaves it, as it
      // would on reload; a new one below the bar never joins.
      const confidence = pinConfidence(pinEvidence(changed));
      const belowBar = minConfidence !== null && confidence !== undefined && confidence < minConfidence;
      if (type === 'pin:remove' || belowBar) {
        setPins((list) => list.filter((p) => p.id !== changed.id));
        setNewPins((list) => list.filter((p) => p.id !== changed.id));
        return;
      }
      setPins((list) => {
        const index = list.findIndex((p) => p.id === changed.id);
        if (index !== -1) {
          // Broadcasts carry no viewer, so keep this viewer's own watch state,
          // nor impressions, so keep the count the day's pick was drawn with.
          const next = [...list];
          next[index] = { ...withHtml, hasFavorite: list[index].hasFavorite, impressionCount: list[index].impressionCount };
          return next;
        }
        if (type !== 'pin:save' || !list.length) return list;
        const times = list.map((p) => new Date(p.utcStartDateTime).getTime());
        const at = new Date(changed.utcStartDateTime).getTime();
        return at >= Math.min(...times) && at <= Math.max(...times) ? [...list, withHtml] : list;
      });
      setNewPins((list) => {
        const index = list.findIndex((p) => p.id === changed.id);
        if (index === -1) {
          return type === 'pin:save' ? [toNewPin(withHtml), ...list].slice(0, NEW_PINS_LIMIT) : list;
        }
        if (type !== 'pin:update') return list;
        // An edit's broadcast is the form's pin: no author, and possibly no
        // created time, so those stay as the panel had them.
        const next = [...list];
        next[index] = { ...toNewPin(withHtml), userName: list[index].userName, utcCreatedDateTime: list[index].utcCreatedDateTime };
        return next;
      });
    };
    const stops = ['pin:save', 'pin:update', 'pin:remove', 'pin:favorite', 'pin:unfavorite', 'pin:like', 'pin:unlike'].map((type) =>
      onLive<CardPin>(type, (changed) => onPin(type, changed)),
    );
    return () => {
      clearTimeout(recount);
      stops.forEach((stop) => stop());
    };
  }, [minConfidence]);

  const loadMore = useCallback(
    async (direction: 'previous' | 'next') => {
      const query = links[direction];
      if (!query || busy.current[direction]) return;
      busy.current[direction] = true;
      const token = loadToken.current;
      try {
        const { page, links: pageLinks } = await fetchPage(query);
        if (token !== loadToken.current) return;
        if (!page.pins.length && !page.dateTimes.length) {
          setLinks((l) => ({ ...l, [direction]: undefined }));
          return;
        }
        if (direction === 'previous') {
          prependAnchor.current = { height: document.documentElement.scrollHeight, top: window.scrollY };
        }
        merge(page);
        setLinks((l) => ({ ...l, [direction]: pageLinks[direction] }));
      } catch {
        // Try again on the next scroll.
      } finally {
        busy.current[direction] = false;
      }
    },
    [links, merge],
  );

  // Sentinels at either end load the next page before the reader gets there.
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || !scrolledToToday.current) continue;
          void loadMore(entry.target === topRef.current ? 'previous' : 'next');
        }
      },
      { rootMargin: '500px 0px' },
    );
    if (topRef.current) observer.observe(topRef.current);
    if (bottomRef.current) observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  // A day as a search (date:), for its "View all": the same
  // "posted within" window, written as the search page reads it.
  const daySearchHref = useCallback(
    (day: string) => {
      const params = new URLSearchParams({ q: `date:${day}` });
      const posted = spanToParam(postedWithin, DEFAULT_POSTED_WITHIN);
      if (posted) params.set('posted', posted);
      return `/search?${params}`;
    },
    [postedWithin],
  );

  // The days at either end of what is loaded, where more pages wait beyond:
  // a page can stop partway through them, so their bags may hold only a few
  // of their pins. Each is counted on the server, so its "View all" appears
  // and counts the pins still to come. Counts are kept per zone and window.
  const edgeDays = useMemo(() => {
    const days = new Set<string>();
    if (bags.length && links.previous) days.add(bags[0].day);
    if (bags.length && links.next) days.add(bags[bags.length - 1].day);
    return days;
  }, [bags, links]);
  const countKey = (day: string) => `${day}|${timeZone}|${postedWithin ?? ''}`;
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const countsAsked = useRef(new Set<string>());
  useEffect(() => {
    if (countsVersion) countsAsked.current.clear();
  }, [countsVersion]);
  useEffect(() => {
    // Hydration renders in the server's zone and switches to the browser's
    // right after: counting in the first would only be thrown away.
    if (timeZone !== browserTimeZone()) return;
    for (const day of edgeDays) {
      const key = `${day}|${timeZone}|${postedWithin ?? ''}`;
      if (countsAsked.current.has(key)) continue;
      countsAsked.current.add(key);
      fetchDayCount(day, timeZone, postedWithin).then(
        (count) => setDayCounts((counts) => ({ ...counts, [key]: count })),
        // Asked again when the day is next at an edge.
        () => countsAsked.current.delete(key),
      );
    }
  }, [edgeDays, timeZone, postedWithin, countsVersion]);

  // A new "posted within" window reloads from the server: the timeline only
  // holds the pages it has scrolled through, so filtering locally would miss
  // pins and page through the unfiltered set.
  async function changePostedWithin(within: string | null) {
    if ((postedWithin || null) === (within || null)) return;
    setPostedWithin(within);
    const token = ++loadToken.current;
    setStatus('loading');
    try {
      const { page, links: pageLinks } = await fetchPage(within ? `?created_within=${encodeURIComponent(within)}` : '');
      if (token !== loadToken.current) return;
      scrolledToToday.current = false;
      setPins(page.pins);
      setDateTimes(page.dateTimes);
      setLinks(pageLinks);
      setStatus('ready');
    } catch {
      if (token === loadToken.current) setStatus('error');
    }
  }

  const empty = !bags.length;
  const phrase = (formatSpan(postedWithin) || '').replace(/^1 /, '');

  return (
    <TimelineVideoProvider setting={video}>
      <div className="px-[max(0.75rem,env(safe-area-inset-left))] pb-24 lg:px-4 xl:pr-[288px]">
        <FloatingControls
          summaryCaption="Posted within"
          summary={spanLabel(postedWithin)}
          onToday={goToToday}
          category={{ summary: categoryPillSummary(), control: <SearchCategoryFilter postedWithin={postedWithin} /> }}
          aside={
            // Needs room for trending's heading and one row (basis-28), or both
            // panels go. Inside, new pins only shows under the whole of trending.
            <div className="pointer-events-none flex min-h-0 grow basis-28 flex-col flex-wrap gap-2 overflow-clip [&>*]:pointer-events-auto [&>*]:w-full">
              <TrendingPins pins={trending.pins} days={trending.days} />
              <NewPins pins={newPins} now={now} />
            </div>
          }
        >
          <TimeRangeSlider
            steps={SPAN_OPTIONS}
            past={postedWithin}
            pastOnly
            pastLabelSpan={defaultSpan}
            onChange={({ past }) => void changePostedWithin(past)}
          />
        </FloatingControls>

        <div ref={topRef} aria-hidden className="h-px" />

        <div className="relative lg:before:absolute lg:before:top-0 lg:before:bottom-0 lg:before:left-[140px] lg:before:w-px lg:before:bg-rail lg:before:content-['']">
          {bags.map((bag, index) => (
            <div key={bag.day}>
              {marker.index === index ? <TodayMarker specialtyDays={specialtyDays[monthDayOf(todayKey)] || []} /> : null}
              <TimeBlock
                bag={bag}
                todayKey={todayKey}
                specialtyDays={specialtyDays[monthDayOf(bag.day)] || []}
                serverTimeZone={serverTimeZone}
                // The first bag is what paints before hydration scrolls to
                // today, so both hold a likely LCP image.
                firstPinPriority={index === 0 || index === (marker.index === -1 ? marker.todayBagIndex : marker.index)}
                sample
                focusId={focus?.id}
                daySearchHref={daySearchHref}
                dayTotal={edgeDays.has(bag.day) ? dayCounts[countKey(bag.day)] : undefined}
              />
            </div>
          ))}
          {marker.atEnd ? <TodayMarker specialtyDays={specialtyDays[monthDayOf(todayKey)] || []} /> : null}
        </div>

        <div ref={bottomRef} aria-hidden className="h-px" />

        {status === 'loading' ? <p className="mt-16 text-center text-subtle" role="status">Loading…</p> : null}
        {status === 'error' ? <p className="mt-16 text-center text-lg text-subtle">Oops, something went wrong. Please try again in a bit...</p> : null}
        {status === 'ready' && empty ? (
          <p className="mt-16 text-center text-lg text-subtle">
            {postedWithin ? `No pins posted in the last ${phrase}.` : 'Oops, something went wrong. Please try again in a bit...'}
          </p>
        ) : null}
      </div>
    </TimelineVideoProvider>
  );
}
