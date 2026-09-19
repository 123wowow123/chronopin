'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { PostedTime, StartDistance, StartTime } from '@/components/ui/LocalTime';
import { money } from '@/lib/format';
import { useVideoPoster } from '@/lib/client/timelineVideo';
import { pinPath } from '@/lib/seo';
import type { CardPin } from '@/lib/types';
import { pinEvidence } from '@/lib/referenceConfidence';
import type { PinTense } from '@/lib/timeline';
import { CitedText } from './CitedText';
import { DateConfidence, DateConfidenceReasoning } from './DateConfidence';
import { DelayBadge } from './DelayBadge';
import { PinConfidence } from './PinConfidence';
import { CompanyTicker } from './CompanyTicker';
import { PinCardOdds } from './PinOdds';
import { PinMediaFrame } from './PinMedia';
import { RatingAverage } from './PinRatings';
import { RefineLink } from './RefineLink';
import { ViewCount } from './ViewCount';
import { WatchButton } from './WatchButton';
import { WeatherIcon } from './WeatherIcon';

const CARD_SIZES = '(max-width: 640px) 100vw, 448px';

// A faint wash and border in the map's past/future colours; ongoing (and untensed) pins stay plain.
const TENSE_CLASS: Record<PinTense, string> = {
  past: 'border-past/60 hover:border-past [--card-bg:color-mix(in_oklab,var(--color-past)_12%,var(--color-panel))]',
  future: 'border-future/60 hover:border-future [--card-bg:color-mix(in_oklab,var(--color-future)_12%,var(--color-panel))]',
  ongoing: 'hover:border-raised-2',
};

// A pin on the timeline or in search results. Away from the timeline (no day
// tag beside it), todayKey adds how far its start is from today.
export function PinCard({
  pin,
  serverTimeZone,
  priority,
  tense,
  todayKey,
}: {
  pin: CardPin;
  serverTimeZone: string;
  priority?: boolean;
  tense?: PinTense;
  todayKey?: string;
}) {
  // On a phone a card shows a video's still instead of its player, unless an
  // admin has turned the players back on.
  const poster = useVideoPoster();
  const href = pinPath(pin);
  const media = pin.media ?? [];
  const hasPlace = pin.latitude != null && pin.longitude != null;

  // Cards are clipped at 600px; "show more" appears only when that cut text off.
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const company = pin.company ? (
    <RefineLink field="company" value={pin.company} className="inline-flex items-center gap-1 text-inherit hover:no-underline">
      {pin.companyLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- favicons from arbitrary hosts
        <img src={pin.companyLogoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-3.5 rounded-sm" />
      ) : null}
      {pin.company}
    </RefineLink>
  ) : null;

  // Company and place as plain text, for a pin without a medium to label.
  const placeRow =
    company || pin.address ? (
      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
        {company ? (
          <span className="inline-flex items-center gap-1.5">
            {company}
            <CompanyTicker pin={pin} />
          </span>
        ) : null}
        {pin.address ? <span>{pin.address}</span> : null}
      </div>
    ) : null;

  return (
    <article
      data-tense={tense}
      className={`surface relative overflow-hidden bg-[var(--card-bg,var(--color-panel))] pb-1.5 transition-[border-color,filter] hover:brightness-110 ${TENSE_CLASS[tense ?? 'ongoing']}`}
    >
      {/* pt-2.5 belongs inside the clip: the meta row's links hang their tap
          area 8px above themselves, which overflow-hidden would cut off. */}
      <div ref={contentRef} className="relative max-h-[600px] overflow-hidden pt-2.5">
        <div className="mx-3 flex items-center justify-between text-[11px] text-subtle [&_a]:relative [&_a]:after:absolute [&_a]:after:-inset-y-2 [&_a]:after:inset-x-0 [&_a]:after:content-['']">
          {/* A dot before every item but the first, kept on the item's line when the row wraps. */}
          <div className="flex min-w-0 flex-wrap items-center [&>*]:whitespace-nowrap [&>*+*]:before:px-1.5 [&>*+*]:before:text-faint [&>*+*]:before:content-['·']">
            {/* Its main category: the pin page lists the rest. */}
            {pin.categories?.[0] ? (
              <span>
                <RefineLink field="tag" value={pin.categories[0]} className="font-medium text-muted hover:text-ink hover:no-underline">
                  {pin.categories[0]}
                </RefineLink>
              </span>
            ) : null}
            {pin.utcCreatedDateTime ? (
              <span>
                <PostedTime value={pin.utcCreatedDateTime} serverTimeZone={serverTimeZone} dateOnly search />
              </span>
            ) : null}
            {pin.user?.userName ? (
              <span>
                <RefineLink field="user" value={pin.user.userName} className="text-inherit hover:text-ink hover:no-underline">
                  {pin.user.userName}
                </RefineLink>
              </span>
            ) : null}
          </div>
          {pin.parentId || pin.rootThread ? (
            <Link href={href} title={pin.parentId ? 'Part of thread' : 'First pin in a thread'} className="text-subtle hover:text-ink">
              <Icon name="thread" className="size-3.5" />
            </Link>
          ) : null}
        </div>

        <h2 className="mx-3 mt-1.5 mb-2.5 font-display text-[19px] leading-snug font-medium tracking-tight text-pretty">
          <Link href={href} className="text-ink transition-colors hover:text-link hover:no-underline">
            {pin.title}
          </Link>
        </h2>

        {media.length ? (
          <PinMediaFrame
            key={media.map((m) => m.originalUrl ?? m.thumbName).join(' ')}
            // A tall picture (a poster) is cropped to its middle, leaving room under
            // it for the start date and some description before the cut-off.
            className="relative mb-3 bg-black [&_img]:max-h-[260px] [&_img]:object-cover"
            overlay={
              <>
                {pin.address ? <span className="media-chip absolute top-2 right-2 z-10 max-w-[70%] truncate">{pin.address}</span> : null}
                {company ? (
                  <span className="media-chip absolute bottom-2 left-2 z-10 inline-flex items-center gap-1.5">
                    {company}
                    <CompanyTicker pin={pin} onDark />
                  </span>
                ) : null}
              </>
            }
            fallback={<div className="mx-3">{placeRow}</div>}
            media={media}
            title={pin.title}
            href={href}
            priority={priority}
            poster={poster}
            sizes={CARD_SIZES}
          />
        ) : null}

        <div className="mx-3">
          {!media.length ? placeRow : null}
          {pin.utcStartDateTime || pin.ratings?.length ? (
            <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              {pin.utcStartDateTime ? (
                <>
                  <StartTime pin={pin} serverTimeZone={serverTimeZone} search />
                  <WeatherIcon pinId={pin.id} hasPlace={hasPlace} />
                  <DateConfidence level={pin.dateConfidence} reasoning={pin.dateConfidenceReasoning} />
                  <DelayBadge pin={pin} />
                  <PinConfidence evidence={pinEvidence(pin)} />
                </>
              ) : null}
              {/* The review-site average, for a film, series or anime pin. */}
              <RatingAverage ratings={pin.ratings} compact />
              {/* How far the start is from today, at the tail of the pills. */}
              {pin.utcStartDateTime && todayKey ? <StartDistance pin={pin} todayKey={todayKey} serverTimeZone={serverTimeZone} /> : null}
              {/* Last, on a line of its own. An unverified pin's reasoning only restates
                  that nothing was found, so it stays hidden. */}
              {pin.utcStartDateTime && pin.dateConfidence !== 'unknown' ? (
                <DateConfidenceReasoning reasoning={pin.dateConfidenceReasoning}>
                  {pin.dateConfidenceReasoning && pin.id ? <CitedText text={pin.dateConfidenceReasoning} evidence={pinEvidence(pin)} hrefBase={href} /> : undefined}
                </DateConfidenceReasoning>
              ) : null}
            </div>
          ) : null}
          <PinCardOdds pin={pin} />
          {pin.safeDescription ? (
            <div className="rich-text text-[15px] leading-relaxed text-ink/90" dangerouslySetInnerHTML={{ __html: pin.safeDescription }} />
          ) : null}
        </div>

        {overflowing ? (
          <Link
            href={href}
            className="absolute right-0 bottom-0 left-0 bg-[var(--card-bg,var(--color-panel))] px-3 pt-0.5 text-right text-sm font-medium before:absolute before:-top-8 before:left-0 before:h-8 before:w-full before:bg-gradient-to-b before:from-transparent before:to-[var(--card-bg,var(--color-panel))] before:content-['']"
          >
            show more
          </Link>
        ) : null}
      </div>

      <div className="mx-3 mt-2.5 grid grid-cols-[1fr_auto_1fr] items-center border-t border-line pt-1.5">
        <div className={`text-sm font-medium tabular-nums ${pin.price != null && pin.price < 0 ? 'text-danger' : 'text-success'}`}>
          {pin.price ? money(pin.price, pin.priceCurrency) : null}
        </div>
        <div>
          {pin.searchScore != null ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-subtle" title="How closely this pin matches the search - cosine similarity, higher is closer">
              <span>{pin.searchScore.toFixed(2)}</span>
              <span className="h-1 w-12 overflow-hidden rounded bg-raised" aria-hidden>
                <span className="block h-full bg-link" style={{ width: `${Math.max(0, Math.min(1, pin.searchScore)) * 100}%` }} />
              </span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-1">
          <ViewCount pinId={pin.id} initial={pin.viewCount} />
          <WatchButton pin={pin} />
        </div>
      </div>
    </article>
  );
}
