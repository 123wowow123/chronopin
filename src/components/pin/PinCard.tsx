'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { PostedTime, StartTime } from '@/components/ui/LocalTime';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { money } from '@/lib/format';
import { useSession } from '@/lib/client/session';
import { pinPath } from '@/lib/seo';
import type { CardPin } from '@/lib/types';
import { DateConfidence } from './DateConfidence';
import { PinMediaFrame } from './PinMedia';
import { RefineLink } from './RefineLink';
import { WatchButton } from './WatchButton';
import { WeatherIcon } from './WeatherIcon';

const CARD_SIZES = '(max-width: 640px) 100vw, 448px';

// A pin on the timeline or in search results.
export function PinCard({ pin, serverTimeZone, priority }: { pin: CardPin; serverTimeZone: string; priority?: boolean }) {
  const { isAdmin } = useSession();
  const href = pinPath(pin);
  const medium = pin.media?.[0];
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
        {company}
        {pin.address ? <span>{pin.address}</span> : null}
      </div>
    ) : null;

  return (
    <article className="surface relative overflow-hidden pt-2.5 pb-1.5 transition-[border-color,box-shadow] hover:border-raised-2 hover:shadow-xl hover:shadow-black/30">
      <div ref={contentRef} className="relative max-h-[600px] overflow-hidden">
        <div className="mx-3 flex items-center justify-between text-[11px] text-subtle [&_a]:relative [&_a]:after:absolute [&_a]:after:-inset-y-2 [&_a]:after:inset-x-0 [&_a]:after:content-['']">
          {/* A dot before every item but the first, kept on the item's line when the row wraps. */}
          <div className="flex min-w-0 flex-wrap items-center [&>*]:whitespace-nowrap [&>*+*]:before:px-1.5 [&>*+*]:before:text-faint [&>*+*]:before:content-['·']">
            {pin.category ? (
              <span>
                <RefineLink field="category" value={pin.category} className="font-medium text-muted hover:text-ink hover:no-underline">
                  {pin.category}
                </RefineLink>
              </span>
            ) : null}
            {pin.utcCreatedDateTime ? (
              <span>
                <Link href={href} className="text-inherit hover:text-ink hover:no-underline">
                  <PostedTime value={pin.utcCreatedDateTime} serverTimeZone={serverTimeZone} />
                </Link>
              </span>
            ) : null}
            {pin.user?.userName ? (
              <span className="inline-flex items-center">
                <RefineLink field="user" value={pin.user.userName} className="inline-flex items-center gap-1 text-inherit hover:text-ink hover:no-underline">
                  {pin.user.pictureUrl ? (
                    <UserAvatar userName={pin.user.userName} pictureUrl={pin.user.pictureUrl} className="size-4 text-[8px]" />
                  ) : null}
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

        <h2 className="mx-3 mt-1.5 mb-2.5 font-display text-[19px] leading-snug font-medium tracking-tight text-balance">
          <Link href={href} className="text-ink transition-colors hover:text-link hover:no-underline">
            {pin.title}
          </Link>
        </h2>

        {medium ? (
          <PinMediaFrame
            key={medium.originalUrl ?? medium.thumbName}
            className="relative mb-3 bg-black"
            overlay={
              <>
                {pin.address ? <span className="media-chip absolute top-2 right-2 z-10 max-w-[70%] truncate">{pin.address}</span> : null}
                {company ? <span className="media-chip absolute bottom-2 left-2 z-10">{company}</span> : null}
              </>
            }
            fallback={<div className="mx-3">{placeRow}</div>}
            medium={medium}
            title={pin.title}
            href={href}
            priority={priority}
            sizes={CARD_SIZES}
          />
        ) : null}

        <div className="mx-3">
          {!medium ? placeRow : null}
          {pin.utcStartDateTime ? (
            <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <StartTime pin={pin} serverTimeZone={serverTimeZone} />
              <WeatherIcon pinId={pin.id} hasPlace={hasPlace} />
              {/* An unverified pin's reasoning only restates that nothing was found. */}
              <DateConfidence level={pin.dateConfidence} reasoning={pin.dateConfidenceReasoning} showReasoning={pin.dateConfidence !== 'unknown'} />
            </div>
          ) : null}
          {pin.safeDescription ? (
            <div className="rich-text text-[15px] leading-relaxed text-ink/90" dangerouslySetInnerHTML={{ __html: pin.safeDescription }} />
          ) : null}
        </div>

        {overflowing ? (
          <Link
            href={href}
            className="absolute right-0 bottom-0 left-0 bg-panel px-3 pt-0.5 text-right text-sm font-medium before:absolute before:-top-8 before:left-0 before:h-8 before:w-full before:bg-gradient-to-b before:from-transparent before:to-panel before:content-['']"
          >
            show more
          </Link>
        ) : null}
      </div>

      <div className="mx-3 mt-2.5 grid grid-cols-[1fr_auto_1fr] items-center border-t border-line pt-1.5">
        <div className={`text-sm font-medium tabular-nums ${pin.price != null && pin.price < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
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
          {isAdmin ? (
            <Link href={`/update/${pin.id}`} className="rounded-md p-1.5 text-subtle hover:bg-raised hover:text-ink" title="Edit pin">
              <Icon name="pencil" className="size-4" />
            </Link>
          ) : null}
          <WatchButton pin={pin} />
        </div>
      </div>
    </article>
  );
}
