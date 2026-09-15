'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FollowButton } from '@/components/pin/FollowButton';
import { PinCard } from '@/components/pin/PinCard';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useManualScrollRestoration } from '@/lib/client/scrollRestoration';
import { useTimeZone } from '@/lib/client/timeZone';
import { dayKeyIn } from '@/lib/format';
import { DEFAULT_POSTED_WITHIN, formatSpan, offsetDate, SPAN_OPTIONS, spanLabel } from '@/lib/postedSpan';
import { buildBags, resolveTodayMarker, todayScrollId } from '@/lib/timeline';
import type { CardPin } from '@/lib/types';
import { SearchCategoryFilter } from './CategoryFilter';
import { FloatingControls } from './FloatingControls';
import { TimeBlock, TodayMarker } from './TimeBlock';
import { TimeRangeSlider } from './TimeRangeSlider';

type SortBy = 'date' | 'relevance';

const rail = "relative lg:before:absolute lg:before:top-0 lg:before:bottom-0 lg:before:left-[140px] lg:before:w-px lg:before:bg-rail lg:before:content-['']";

function SortToggle({ value, onChange, className = '' }: { value: SortBy; onChange: (value: SortBy) => void; className?: string }) {
  return (
    <div role="group" aria-label="Sort results by" className={`flex items-center gap-1 p-1.5 text-sm ${className}`}>
      <span className="px-2 text-subtle">Sort by</span>
      {(['date', 'relevance'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`flex-1 rounded-lg px-2.5 py-1 font-medium capitalize transition-colors ${value === option ? 'bg-accent text-white' : 'text-muted hover:bg-raised hover:text-ink'}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

// Search results: on the timeline by date (opening on today), or as a flat
// list ranked by relevance for free-text searches.
export function SearchResults({
  pins,
  serverTimeZone,
  serverNow,
  searchedUser,
  specialtyDays,
  error,
  query = '',
  onlyWatched = false,
}: {
  pins: CardPin[];
  serverTimeZone: string;
  serverNow: string;
  searchedUser?: { id: number; userName: string };
  specialtyDays: Record<string, string[]>;
  error?: string;
  query?: string;
  onlyWatched?: boolean;
}) {
  const timeZone = useTimeZone(serverTimeZone);
  const [postedWithin, setPostedWithin] = useState<string | null>(DEFAULT_POSTED_WITHIN);
  const hasRelevance = pins.some((p) => p.searchScore != null);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [relevanceShown, setRelevanceShown] = useState(false);

  // Results are a complete set, so "posted within" filters them in place.
  const visible = useMemo(() => {
    if (!postedWithin) return pins;
    const cutoff = offsetDate(new Date(serverNow), postedWithin, -1);
    return cutoff ? pins.filter((p) => p.utcCreatedDateTime && new Date(p.utcCreatedDateTime) >= cutoff) : pins;
  }, [pins, postedWithin, serverNow]);

  const todayKey = dayKeyIn(serverNow, timeZone);
  const bags = useMemo(() => buildBags(visible, [], timeZone), [visible, timeZone]);
  const marker = resolveTodayMarker(bags, todayKey);
  // By relevance, pins drop the timeline's day grouping and rail entirely:
  // just a flat ranked list.
  const ranked = useMemo(() => [...visible].sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0)), [visible]);

  const scrollToToday = () => {
    const id = todayScrollId(bags, marker);
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  };

  const scrolled = useRef(false);
  useLayoutEffect(() => {
    if (scrolled.current || sortBy !== 'date' || !bags.length) return;
    scrolled.current = true;
    const id = todayScrollId(bags, marker);
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [bags, marker, sortBy]);
  // Each sort keeps its own place; relevance first opens at the top.
  const scrollBySort = useRef<Partial<Record<SortBy, number>>>({});
  const changeSort = (next: SortBy) => {
    if (next === sortBy) return;
    scrollBySort.current[sortBy] = window.scrollY;
    setSortBy(next);
    if (next === 'relevance') setRelevanceShown(true);
  };
  const shownSort = useRef(sortBy);
  useLayoutEffect(() => {
    if (shownSort.current === sortBy) return;
    shownSort.current = sortBy;
    window.scrollTo({ top: scrollBySort.current[sortBy] ?? 0 });
  }, [sortBy]);
  // After the effects above, so the position it records on mount is today's.
  useManualScrollRestoration();

  const phrase = (formatSpan(postedWithin) || '').replace(/^1 /, '');

  return (
    <div className="px-3 pb-24 lg:px-4 xl:pr-[288px]">
      <FloatingControls
        summary={searchedUser ? searchedUser.userName : `Posted within ${spanLabel(postedWithin)}`}
        onToday={sortBy === 'date' && bags.length ? scrollToToday : undefined}
      >
        <TimeRangeSlider steps={SPAN_OPTIONS} past={postedWithin} pastOnly onChange={({ past }) => setPostedWithin(past)} />
        <SearchCategoryFilter
          query={query}
          onlyWatched={onlyWatched}
          createdSince={postedWithin ? offsetDate(new Date(serverNow), postedWithin, -1)?.toISOString() : null}
        />
        {hasRelevance ? <SortToggle value={sortBy} onChange={changeSort} className="floating max-xl:hidden" /> : null}
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
      {hasRelevance ? (
        <div data-sticky-sort className="sticky top-[52px] z-20 -mx-3 flex justify-center bg-header/85 px-3 py-2 shadow-[0_1px_0_var(--color-line)] backdrop-blur-md lg:-mx-4 xl:hidden">
          <SortToggle value={sortBy} onChange={changeSort} className="w-full max-w-sm rounded-xl bg-field ring-1 ring-line ring-inset" />
        </div>
      ) : null}

      {error ? <p className="mt-16 text-center text-lg text-subtle">Search is unavailable right now. Please try again in a bit.</p> : null}
      {!error && !visible.length ? (
        <p className="mt-16 text-center text-lg text-subtle">
          {postedWithin && pins.length
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
        <ul hidden={sortBy !== 'relevance'} className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] items-start gap-2.5">
          {ranked.map((pin, i) => (
            <li key={pin.id} id={`rank-${pin.id}`}>
              <PinCard pin={pin} serverTimeZone={serverTimeZone} priority={i === 0} />
            </li>
          ))}
        </ul>
      ) : null}
      <div hidden={sortBy !== 'date'} className={rail}>
        {bags.map((bag, index) => (
          <div key={bag.day}>
            {marker.index === index ? <TodayMarker specialtyDays={specialtyDays[todayKey.slice(5)] || []} /> : null}
            <TimeBlock bag={bag} todayKey={todayKey} specialtyDays={specialtyDays[bag.day.slice(5)] || []} serverTimeZone={serverTimeZone} />
          </div>
        ))}
        {marker.atEnd ? <TodayMarker specialtyDays={specialtyDays[todayKey.slice(5)] || []} /> : null}
      </div>
    </div>
  );
}
