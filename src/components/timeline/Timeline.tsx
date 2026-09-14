'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { api, parseLinkHeader } from '@/lib/client/api';
import { useNow } from '@/lib/client/now';
import { safeHtmlInBrowser } from '@/lib/client/sanitize';
import { useManualScrollRestoration } from '@/lib/client/scrollRestoration';
import { useTimeZone } from '@/lib/client/timeZone';
import { dayKeyIn } from '@/lib/format';
import { formatSpan, SPAN_OPTIONS } from '@/lib/postedSpan';
import { buildBags, resolveTodayMarker, todayScrollId } from '@/lib/timeline';
import type { CardPin, DateTimeJson, TimelinePage } from '@/lib/types';
import { FloatingControls } from './FloatingControls';
import { TimeBlock, TodayMarker } from './TimeBlock';
import { TimeRangeSlider } from './TimeRangeSlider';

type Links = { previous?: string; next?: string };

// All specialty days, fetched once when a page beyond the first needs them.
let specialtyRequest: Promise<Record<string, string[]>> | null = null;
function loadSpecialtyDays() {
  specialtyRequest ??= fetch('/api/specialty-days')
    .then((res) => res.json())
    .catch(() => {
      specialtyRequest = null;
      return {};
    });
  return specialtyRequest;
}

async function fetchPage(query: string): Promise<{ page: TimelinePage; links: Links }> {
  const res = await fetch(`/api/main${query}`, { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(`timeline page failed: ${res.status}`);
  }
  const page = (await res.json()) as TimelinePage;
  page.pins = page.pins.map((pin) => ({ ...pin, safeDescription: safeHtmlInBrowser(pin.description) }));
  return { page, links: parseLinkHeader(res.headers.get('link')) };
}

// The home timeline: the first page arrives server-rendered; earlier and later
// pages load as the reader scrolls toward either end.
export function Timeline({
  initialPins,
  initialDateTimes,
  initialLinks,
  serverTimeZone,
  initialPostedWithin,
  defaultSpan,
  initialSpecialtyDays,
  serverNow,
}: {
  initialPins: CardPin[];
  initialDateTimes: DateTimeJson[];
  initialLinks: Links;
  serverTimeZone: string;
  initialPostedWithin: string | null;
  defaultSpan: string;
  initialSpecialtyDays: Record<string, string[]>;
  // When the server rendered, so "today" matches during hydration.
  serverNow: string;
}) {
  const timeZone = useTimeZone(serverTimeZone);
  const [pins, setPins] = useState(initialPins);
  const [dateTimes, setDateTimes] = useState(initialDateTimes);
  const [links, setLinks] = useState(initialLinks);
  const [postedWithin, setPostedWithin] = useState(initialPostedWithin);
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('ready');
  const [specialtyDays, setSpecialtyDays] = useState(initialSpecialtyDays);
  // Ticks each minute, so "today" rolls over at midnight.
  const now = useNow(60_000, new Date(serverNow).getTime());

  const loadToken = useRef(0);
  const busy = useRef({ previous: false, next: false });
  const scrolledToToday = useRef(false);
  const prependAnchor = useRef<{ height: number; top: number } | null>(null);

  const todayKey = dayKeyIn(now, timeZone);
  const bags = useMemo(() => buildBags(pins, dateTimes, timeZone), [pins, dateTimes, timeZone]);
  const marker = resolveTodayMarker(bags, todayKey);

  useEffect(() => {
    if (bags.some((bag) => !(bag.day.slice(5) in specialtyDays))) {
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

  // Open on today, once the first page is on screen.
  useLayoutEffect(() => {
    if (!scrolledToToday.current && bags.length) {
      scrollToToday();
      scrolledToToday.current = true;
    }
  }, [bags, scrollToToday]);
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
  // within the stretch of timeline already loaded.
  useEffect(() => {
    const source = new EventSource('/api/pins/stream');
    const onPin = (event: MessageEvent) => {
      const changed = JSON.parse(event.data) as CardPin;
      const withHtml = { ...changed, safeDescription: safeHtmlInBrowser(changed.description) };
      if (event.type === 'pin:remove') {
        setPins((list) => list.filter((p) => p.id !== changed.id));
        return;
      }
      setPins((list) => {
        const index = list.findIndex((p) => p.id === changed.id);
        if (index !== -1) {
          // Broadcasts carry no viewer, so keep this viewer's own watch state.
          const next = [...list];
          next[index] = { ...withHtml, hasFavorite: list[index].hasFavorite };
          return next;
        }
        if (event.type !== 'pin:save' || !list.length) return list;
        const times = list.map((p) => new Date(p.utcStartDateTime).getTime());
        const at = new Date(changed.utcStartDateTime).getTime();
        return at >= Math.min(...times) && at <= Math.max(...times) ? [...list, withHtml] : list;
      });
    };
    for (const type of ['pin:save', 'pin:update', 'pin:remove', 'pin:favorite', 'pin:unfavorite', 'pin:like', 'pin:unlike']) {
      source.addEventListener(type, onPin as EventListener);
    }
    return () => source.close();
  }, []);

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
    <div className="px-[max(0.75rem,env(safe-area-inset-left))] pb-24 lg:px-4 xl:pr-[288px]">
      <FloatingControls summary={`Posted within ${formatSpan(postedWithin) || 'All'}`} onToday={scrollToToday}>
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
            {marker.index === index ? <TodayMarker specialtyDays={specialtyDays[todayKey.slice(5)] || []} /> : null}
            <TimeBlock
              bag={bag}
              todayKey={todayKey}
              specialtyDays={specialtyDays[bag.day.slice(5)] || []}
              serverTimeZone={serverTimeZone}
              // The first bag is what paints before hydration scrolls to
              // today, so both hold a likely LCP image.
              firstPinPriority={index === 0 || index === (marker.index === -1 ? marker.todayBagIndex : marker.index)}
            />
          </div>
        ))}
        {marker.atEnd ? <TodayMarker specialtyDays={specialtyDays[todayKey.slice(5)] || []} /> : null}
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
  );
}
