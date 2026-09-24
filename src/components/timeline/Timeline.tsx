'use client';

import { useRouter } from '@/lib/client/navigation';
import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { parseLinkHeader } from '@/lib/client/api';
import { createPageAhead } from '@/lib/client/pageAhead';
import { onLive, onLiveReconnect } from '@/lib/client/liveFeed';
import { useNow } from '@/lib/client/now';
import { safeHtmlInBrowser } from '@/lib/client/sanitize';
import { useManualScrollRestoration } from '@/lib/client/scrollRestoration';
import { loadSpecialtyDays } from '@/lib/client/specialtyDays';
import { takeTimelineSpot } from '@/lib/client/returnSpot';
import { useTodayHold } from '@/lib/client/todayHold';
import { useQueryState } from '@/lib/client/urlState';
import { viewerPlace, type ViewerPlace } from '@/lib/client/viewerPlace';
import { distanceKm } from '@/lib/distance';
import { radiusFromParam, radiusLabel, radiusSteps, radiusToParam } from '@/lib/radius';
import { usesImperial } from '@/lib/weather';
import { browserTimeZone, useTimeZone } from '@/lib/client/timeZone';
import { daysBetween, dayKeyIn, monthDayOf } from '@/lib/format';
import { DEFAULT_POSTED_WITHIN, SPAN_OPTIONS, spanLabel, spanPhrase, spanToParam } from '@/lib/postedSpan';
import { pinConfidence, pinEvidence } from '@/lib/referenceConfidence';
import { TimelineVideoProvider } from '@/lib/client/timelineVideo';
import { buildBags, pinDayKey, resolveTodayMarker, todayScrollId } from '@/lib/timeline';
import type { TimelineVideoSetting } from '@/lib/timelineVideo';
import type { CardPin, DateTimeJson, NewPin, TimelinePage, TrendingPin } from '@/lib/types';
import { personalWeigher, type UserPreference } from '@/lib/userWiki';
import { DistanceSlider } from './DistanceSlider';
import { TagCloud, tagPillSummary } from './TagCloud';
import { FloatingControls } from './FloatingControls';
import { NewPins, withLivePin } from './NewPins';
import { TimeBlock, TodayMarker } from './TimeBlock';
import { TimeRangeSlider } from './TimeRangeSlider';
import { TrendingPins } from './TrendingPins';
import { useT } from '@/lib/client/i18n';
import { withPageLang } from '@/lib/client/navigation';

type Links = { previous?: string; next?: string };

// How long a burst of live pin changes is let settle before the days at
// either end of the loaded stretch are counted again.
const RECOUNT_DELAY_MS = 500;

// The pin a timeline opened on (the pin page's "To timeline"): the timeline
// starts there, centred, rather than on today.
type Focus = { id: number; utcStartDateTime: string; allDay?: boolean };

const NO_TODAY_MARKER: ReturnType<typeof resolveTodayMarker> = { index: -1, atEnd: false, todayBagIndex: -1 };

// The ring the timeline is narrowed to: how far out, and the place it is
// measured from. Only the browser knows that place, so it travels with each
// request rather than sitting in the URL for a shared link to hand on.
type Ring = { km: number; place: ViewerPlace };

// Whether a pin's place falls inside the ring. A pin with no place on the map
// is not near anywhere, which is what the server's ST_DWithin says too.
function inRing(pin: { latitude?: number; longitude?: number }, ring: Ring): boolean {
  if (pin.latitude == null || pin.longitude == null) return false;
  return distanceKm(ring.place, { latitude: pin.latitude, longitude: pin.longitude }) <= ring.km;
}

// The ring as the API reads it: kilometres with the unit spelled out and no
// rounding, whatever unit the reader set it in. Only the URL a person sees is
// tidied - a radius that shifted between requests would move the edge of the
// ring under the pins sitting on it.
function ringParams(params: URLSearchParams, ring: Ring | null) {
  if (!ring) return params;
  params.set('near', `${ring.place.latitude},${ring.place.longitude}`);
  params.set('within', `${ring.km}km`);
  return params;
}

async function fetchPage(query: string): Promise<{ page: TimelinePage; links: Links }> {
  const res = await fetch(withPageLang(`/api/main${query}`), { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(`timeline page failed: ${res.status}`);
  }
  const page = (await res.json()) as TimelinePage;
  page.pins = page.pins.map((pin) => ({ ...pin, safeDescription: safeHtmlInBrowser(pin.description) }));
  return { page, links: parseLinkHeader(res.headers.get('link')) };
}

// How many pins one day really has, loaded or not.
async function fetchDayCount(day: string, timeZone: string, postedWithin: string | null, ring: Ring | null): Promise<number> {
  const params = new URLSearchParams({ day, tz: timeZone });
  if (postedWithin) params.set('created_within', postedWithin);
  ringParams(params, ring);
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
  initialWithin,
  defaultPostedWithin,
  initialSpecialtyDays,
  serverNow,
  minConfidence,
  video,
  sliderTyping = false,
  tagList = false,
  trending,
  newPins: initialNewPins,
  preference,
}: {
  focus: Focus | null;
  initialPins: CardPin[];
  initialDateTimes: DateTimeJson[];
  initialLinks: Links;
  serverTimeZone: string;
  initialPostedWithin: string | null;
  // The ring from the URL (?within=50km), as written. It is only resolved in
  // the browser: the radius may be a bare number in the reader's own unit,
  // and the place to measure from is the browser's alone.
  initialWithin: string | null;
  // The viewer's saved preference (or the site default): left out of the URL.
  defaultPostedWithin: string | null;
  initialSpecialtyDays: Record<string, string[]>;
  // When the server rendered, so "today" matches during hydration.
  serverNow: string;
  // The score a pin needs to show (the admin setting), or null to show every pin.
  minConfidence: number | null;
  // Whether a card here loads its video player on a phone (the admin setting).
  video: TimelineVideoSetting;
  // Whether the filter sliders offer a typed box (the admin setting).
  sliderTyping?: boolean;
  // The admin setting: whether the tag panel lists its tags, or opens the big cloud.
  tagList?: boolean;
  // The most viewed pins with rising views, beside the cards on wide screens.
  trending: { pins: TrendingPin[]; days: number };
  // The pins added most recently, under trending on wide screens. Kept live
  // from the same SSE stream as the timeline itself, so a new pin appears
  // here without a reload or any polling of its own.
  newPins: NewPin[];
  // The signed-in viewer's preference wiki, which weighs a crowded day's
  // pick toward what they open and lean to; null for none.
  preference: UserPreference | null;
}) {
  const timeZone = useTimeZone(serverTimeZone);
  const t = useT();
  const [pins, setPins] = useState(initialPins);
  const [newPins, setNewPins] = useState(initialNewPins);
  const [dateTimes, setDateTimes] = useState(initialDateTimes);
  const [links, setLinks] = useState(initialLinks);
  const [postedWithin, setPostedWithin] = useState(initialPostedWithin);
  // Miles or kilometres, and roughly where the viewer is: both the browser's
  // to answer, so neither is known until it has hydrated and looked.
  const [imperial, setImperial] = useState(false);
  const [place, setPlace] = useState<ViewerPlace | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  // Memoised: the day counts and the live feed both watch it, and a fresh
  // object each render would set them going again on every keystroke.
  const ring = useMemo<Ring | null>(() => (radiusKm && place ? { km: radiusKm, place } : null), [radiusKm, place]);
  useQueryState({ posted: spanToParam(postedWithin, defaultPostedWithin), within: radiusToParam(radiusKm, imperial) });
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('ready');
  // Bumped when pins are added, edited or removed, so the days at either end
  // of the loaded stretch are counted again: any change may have moved a pin
  // into or out of one.
  const [countsVersion, setCountsVersion] = useState(0);
  const [specialtyDays, setSpecialtyDays] = useState(initialSpecialtyDays);
  // Ticks each minute, so "today" rolls over at midnight.
  const now = useNow(60_000, new Date(serverNow).getTime());

  const loadToken = useRef(0);
  // Pages fetched ahead of the reader (src/lib/client/pageAhead.ts).
  const [ahead] = useState(() => createPageAhead(fetchPage));
  const busy = useRef({ previous: false, next: false });
  const scrolledToToday = useRef(false);
  const prependAnchor = useRef<{ height: number; top: number } | null>(null);

  const todayKey = dayKeyIn(now, timeZone);
  // Whether the timeline is showing less than all of itself, which decides
  // what an empty day is worth (see bags).
  const filtered = !!postedWithin || !!ring;
  const bags = useMemo(() => {
    const all = buildBags(pins, dateTimes, timeZone);
    // Narrowed to a posting window or to a ring around the viewer, the pins
    // left are spread thin, and the days between them carry nothing but their
    // own holidays. Each of those is a full block of empty timeline beside its
    // markers: within 25 miles a few pages come to 667 of them against 118
    // cards, and the cards that survived the filter are lost among them. So a
    // filtered timeline draws only days that have a pin, and the holidays show
    // where they always did on such a day - as tags beside its cards.
    //
    // Whole, the timeline keeps them: its pins are a day or two apart, so a
    // marker's own day sits among cards as furniture rather than filler.
    return filtered ? all.filter((bag) => bag.pins.length) : all;
  }, [pins, dateTimes, timeZone, filtered]);
  const boost = useMemo(() => (preference ? personalWeigher(preference) : undefined), [preference]);
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

  // A new window or a new ring reloads from the server: the timeline only
  // holds the pages it has scrolled through, so filtering locally would miss
  // pins and page through the unfiltered set.
  const reload = useCallback(async (within: string | null, nextRing: Ring | null) => {
    const params = new URLSearchParams();
    if (within) params.set('created_within', within);
    ringParams(params, nextRing);
    const token = ++loadToken.current;
    ahead.clear();
    setStatus('loading');
    try {
      const { page, links: pageLinks } = await fetchPage(params.size ? `?${params}` : '');
      if (token !== loadToken.current) return;
      scrolledToToday.current = false;
      setPins(page.pins);
      setDateTimes(page.dateTimes);
      setLinks(pageLinks);
      setStatus('ready');
    } catch {
      if (token === loadToken.current) setStatus('error');
    }
  }, [ahead]);

  // The latest posting window, for the one effect below that runs long after
  // the render it was started in.
  const latestPosted = useRef(postedWithin);
  useLayoutEffect(() => {
    latestPosted.current = postedWithin;
  });

  // Roughly where the viewer is, asked once (viewerPlace prompts for nothing),
  // and whether they read miles. The ring is measured from that place, so a
  // ring the URL already carries can only be applied once it is known: the
  // server rendered the first page without it, since only the browser knows
  // where the viewer is.
  useEffect(() => {
    let cancelled = false;
    void viewerPlace().then((found) => {
      if (cancelled || !found) return;
      const units = usesImperial();
      setImperial(units);
      setPlace(found);
      // A bare radius in the URL ("within=50") is read in the unit the reader
      // uses, so the ring can only be resolved once that is known too.
      const asked = radiusFromParam(initialWithin, units);
      if (!asked) return;
      setRadiusKm(asked);
      void reload(latestPosted.current, { km: asked, place: found });
    });
    return () => {
      cancelled = true;
    };
  }, [initialWithin, reload]);

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
    const query = new URLSearchParams();
    const posted = spanToParam(postedWithin, defaultPostedWithin);
    if (posted) query.set('posted', posted);
    const within = radiusToParam(radiusKm, imperial);
    if (within) query.set('within', within);
    router.push(query.size ? `/?${query}` : '/');
  }, [reachesToday, holdToday, postedWithin, defaultPostedWithin, radiusKm, imperial, router]);
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
  const liveBefore = useRef(false);
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
      setNewPins((list) => withLivePin(list, type, changed, belowBar));
      if (type === 'pin:remove' || belowBar) {
        setPins((list) => list.filter((p) => p.id !== changed.id));
        return;
      }
      // A pin moved outside the ring the timeline is narrowed to leaves the
      // cards, as it would on reload, and one saved outside it never joins.
      // The new pins panel is not narrowed by distance, so it keeps both.
      if (ring && !inRing(changed, ring)) {
        setPins((list) => list.filter((p) => p.id !== changed.id));
      } else {
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
      }
    };
    const stops = ['pin:save', 'pin:update', 'pin:remove', 'pin:favorite', 'pin:unfavorite', 'pin:like', 'pin:unlike'].map((type) =>
      onLive<CardPin>(type, (changed) => onPin(type, changed)),
    );
    // What broadcasts may have been missed - while the stream was down, or
    // while this page sat hidden (React Activity keeps it mounted but stops
    // its effects) - the new pins panel fetches again rather than goes stale.
    const refreshNewPins = () => {
      fetch(withPageLang('/api/pins/highlights'), { credentials: 'same-origin' })
        .then((res) => (res.ok ? (res.json() as Promise<{ newPins: NewPin[] }>) : null))
        .then((next) => {
          if (next) setNewPins(next.newPins);
        })
        .catch(() => {});
    };
    if (liveBefore.current) refreshNewPins();
    liveBefore.current = true;
    const stopReconnect = onLiveReconnect(refreshNewPins);
    return () => {
      clearTimeout(recount);
      stops.forEach((stop) => stop());
      stopReconnect();
    };
  }, [minConfidence, ring]);

  // The page past each end of what is loaded, fetched as soon as its link is
  // known, so reaching an end shows it at once rather than waiting on it.
  useEffect(() => {
    ahead.warm(links.next);
    ahead.warm(links.previous);
  }, [ahead, links]);

  const loadMore = useCallback(
    async (direction: 'previous' | 'next') => {
      const query = links[direction];
      if (!query || busy.current[direction]) return;
      busy.current[direction] = true;
      const token = loadToken.current;
      try {
        const { page, links: pageLinks } = await ahead.take(query);
        if (token !== loadToken.current) return;
        if (!page.pins.length && !page.dateTimes.length) {
          setLinks((l) => ({ ...l, [direction]: undefined }));
          return;
        }
        const add = () => {
          merge(page);
          setLinks((l) => ({ ...l, [direction]: pageLinks[direction] }));
        };
        if (direction === 'previous') {
          // Added above: drawn at once, so the view is held still from the
          // scroll position read here.
          prependAnchor.current = { height: document.documentElement.scrollHeight, top: window.scrollY };
          add();
        } else {
          // Added below the reader, out of sight: drawn as a transition, which
          // gives way to their scrolling rather than holding up a frame.
          startTransition(add);
        }
      } catch {
        // Try again on the next scroll.
      } finally {
        busy.current[direction] = false;
      }
    },
    [ahead, links, merge],
  );

  // Sentinels at either end load the next page before the reader gets there:
  // about three screens early, so it is in (from memory, above) well before
  // a fast scroll reaches the end.
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
      { rootMargin: '2500px 0px' },
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
  const ringKey = ring ? `${ring.place.latitude},${ring.place.longitude},${ring.km}` : '';
  const countKey = (day: string) => `${day}|${timeZone}|${postedWithin ?? ''}|${ringKey}`;
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
      const key = `${day}|${timeZone}|${postedWithin ?? ''}|${ringKey}`;
      if (countsAsked.current.has(key)) continue;
      countsAsked.current.add(key);
      fetchDayCount(day, timeZone, postedWithin, ring).then(
        (count) => setDayCounts((counts) => ({ ...counts, [key]: count })),
        // Asked again when the day is next at an edge.
        () => countsAsked.current.delete(key),
      );
    }
  }, [edgeDays, timeZone, postedWithin, ring, ringKey, countsVersion]);

  function changePostedWithin(within: string | null) {
    if ((postedWithin || null) === (within || null)) return;
    setPostedWithin(within);
    void reload(within, ring);
  }

  function changeRadius(km: number | null) {
    if (radiusKm === km) return;
    setRadiusKm(km);
    // No place to measure from (a refused lookup, a zone that names no city):
    // the slider is not shown at all, so this cannot narrow to nothing.
    void reload(postedWithin, km && place ? { km, place } : null);
  }

  const empty = !bags.length;
  const phrase = spanPhrase(postedWithin, t.locale);
  const radiusText = radiusLabel(radiusKm, imperial, t.locale);
  // Behind one pill, both sliders share its face, so it is captioned for the
  // pair ("Filter") and says what each is set to; each keeps its own heading
  // inside, being a row that folds its slider away like the tag panel above.
  const summary = ring ? `${spanLabel(postedWithin, t.locale)} · ${radiusText}` : spanLabel(postedWithin, t.locale);

  return (
    <TimelineVideoProvider setting={video}>
      <div className="px-[max(0.75rem,env(safe-area-inset-left))] pb-24 lg:px-4 xl:pr-[288px]">
        <FloatingControls
          merge
          typing={sliderTyping}
          tagList={tagList}
          summaryCaption={t('controls.filter')}
          summary={summary}
          summaryIsPostedWithin={false}
          onToday={goToToday}
          tags={{ summary: tagPillSummary(undefined, t.locale), control: <TagCloud postedWithin={postedWithin} /> }}
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
            collapsible
            onChange={({ past }) => changePostedWithin(past)}
          />
          {/* Only once the browser has found somewhere to measure from: with
              no place there is no ring to set, and a crawler or a viewer on a
              zone that names no city sees the timeline as it always was. */}
          {place ? (
            <DistanceSlider
              steps={radiusSteps(imperial)}
              radius={radiusKm}
              imperial={imperial}
              placeName={place.name}
              collapsible
              onChange={changeRadius}
            />
          ) : null}
        </FloatingControls>

        <div ref={topRef} aria-hidden className="h-px" />

        <div className="relative lg:min-h-[calc(100dvh-52px-6rem)] lg:before:absolute lg:before:top-0 lg:before:-bottom-24 lg:before:left-[140px] lg:before:w-px lg:before:bg-rail lg:before:content-['']">
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
                boost={boost}
                daySearchHref={daySearchHref}
                dayTotal={edgeDays.has(bag.day) ? dayCounts[countKey(bag.day)] : undefined}
              />
            </div>
          ))}
          {marker.atEnd ? <TodayMarker specialtyDays={specialtyDays[monthDayOf(todayKey)] || []} /> : null}
        </div>

        <div ref={bottomRef} aria-hidden className="h-px" />

        {status === 'loading' ? <p className="mt-16 text-center text-subtle" role="status">{t('common.loading')}</p> : null}
        {status === 'error' ? <p className="mt-16 text-center text-lg text-subtle">{t('timeline.error')}</p> : null}
        {status === 'ready' && empty ? (
          <p className="mt-16 text-center text-lg text-subtle">
            {ring
              ? t('timeline.noPinsNear', { radius: radiusText })
              : postedWithin
                ? t('timeline.noPinsPosted', { span: phrase })
                : t('timeline.error')}
          </p>
        ) : null}
      </div>
    </TimelineVideoProvider>
  );
}
