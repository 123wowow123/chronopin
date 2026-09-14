'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FollowButton } from '@/components/pin/FollowButton';
import { PinCard } from '@/components/pin/PinCard';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useTimeZone } from '@/lib/client/timeZone';
import { dayKeyIn } from '@/lib/format';
import { formatSpan, offsetDate, SPAN_OPTIONS } from '@/lib/postedSpan';
import { buildBags, resolveTodayMarker, todayScrollId } from '@/lib/timeline';
import type { CardPin } from '@/lib/types';
import { TimeBlock, TodayMarker } from './TimeBlock';
import { TimeRangeSlider } from './TimeRangeSlider';

// Search results: on the timeline by date (opening on today), or ranked by
// relevance for free-text searches.
export function SearchResults({
  pins,
  serverTimeZone,
  serverNow,
  searchedUser,
  specialtyDays,
  error,
}: {
  pins: CardPin[];
  serverTimeZone: string;
  serverNow: string;
  searchedUser?: { id: number; userName: string };
  specialtyDays: Record<string, string[]>;
  error?: string;
}) {
  const timeZone = useTimeZone(serverTimeZone);
  const [postedWithin, setPostedWithin] = useState<string | null>(null);
  const hasRelevance = pins.some((p) => p.searchScore != null);
  const [sortBy, setSortBy] = useState<'date' | 'relevance'>('date');

  // Results are a complete set, so "posted within" filters them in place.
  const visible = useMemo(() => {
    if (!postedWithin) return pins;
    const cutoff = offsetDate(new Date(serverNow), postedWithin, -1);
    return cutoff ? pins.filter((p) => p.utcCreatedDateTime && new Date(p.utcCreatedDateTime) >= cutoff) : pins;
  }, [pins, postedWithin, serverNow]);

  const todayKey = dayKeyIn(serverNow, timeZone);
  const bags = useMemo(() => buildBags(visible, [], timeZone), [visible, timeZone]);
  const marker = resolveTodayMarker(bags, todayKey);
  const ranked = useMemo(() => [...visible].sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0)), [visible]);

  const scrolled = useRef(false);
  useLayoutEffect(() => {
    if (scrolled.current || sortBy !== 'date' || !bags.length) return;
    scrolled.current = true;
    const id = todayScrollId(bags, marker);
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [bags, marker, sortBy]);

  const phrase = (formatSpan(postedWithin) || '').replace(/^1 /, '');

  return (
    <div className="px-3 pb-24 lg:px-4">
      <div className="fixed top-[64px] right-2.5 z-30 flex w-64 flex-col items-stretch gap-2">
        <TimeRangeSlider steps={SPAN_OPTIONS} past={postedWithin} pastOnly onChange={({ past }) => setPostedWithin(past)} />
        {hasRelevance ? (
          <div role="group" aria-label="Sort results by" className="flex items-center gap-2 rounded-md bg-black/85 px-3 py-2 text-sm">
            <span className="text-muted">Sort by</span>
            {(['date', 'relevance'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={sortBy === option}
                onClick={() => setSortBy(option)}
                className={`rounded px-2 py-0.5 capitalize ${sortBy === option ? 'bg-accent text-white' : 'text-ink hover:bg-raised'}`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
        {searchedUser ? (
          <div className="flex flex-col gap-2 rounded-md bg-black/85 px-3 py-2">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <UserAvatar userName={searchedUser.userName} className="size-7 text-sm" />
              {searchedUser.userName}
            </div>
            <FollowButton userId={searchedUser.id} userName={searchedUser.userName} showCount />
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-16 text-center text-lg text-subtle">Search is unavailable right now. Please try again in a bit.</p> : null}
      {!error && !visible.length ? (
        <p className="mt-16 text-center text-lg text-subtle">
          {postedWithin && pins.length ? `No results posted in the last ${phrase}.` : 'No results found, please try a different search'}
        </p>
      ) : null}

      {sortBy === 'relevance' ? (
        <ul className="mt-4 gap-2.5 sm:columns-2 lg:ml-[170px] lg:max-w-[906px]">
          {ranked.map((pin) => (
            <li key={pin.id} className="mb-2.5 break-inside-avoid">
              <PinCard pin={pin} serverTimeZone={serverTimeZone} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="relative lg:before:absolute lg:before:top-0 lg:before:bottom-0 lg:before:left-[140px] lg:before:w-px lg:before:bg-rail lg:before:content-['']">
          {bags.map((bag, index) => (
            <div key={bag.day}>
              {marker.index === index ? <TodayMarker specialtyDays={specialtyDays[todayKey.slice(5)] || []} /> : null}
              <TimeBlock bag={bag} todayKey={todayKey} specialtyDays={specialtyDays[bag.day.slice(5)] || []} serverTimeZone={serverTimeZone} />
            </div>
          ))}
          {marker.atEnd ? <TodayMarker specialtyDays={specialtyDays[todayKey.slice(5)] || []} /> : null}
        </div>
      )}
    </div>
  );
}
