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
import { PinMedia } from './PinMedia';
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

  return (
    <article className="relative rounded-lg bg-panel pt-[7px] pb-[7px] transition-shadow hover:shadow-[0_1px_6px_rgba(0,0,0,0.3)]">
      <div ref={contentRef} className="relative max-h-[600px] overflow-hidden">
        <div className="mx-2.5 flex items-center justify-between text-[10px] text-muted [&_a]:relative [&_a]:after:absolute [&_a]:after:-inset-y-2 [&_a]:after:inset-x-0 [&_a]:after:content-['']">
          <div className="flex min-w-0 flex-wrap items-center">
            {pin.category ? (
              <>
                <RefineLink field="category" value={pin.category} className="text-inherit hover:no-underline">
                  {pin.category}
                </RefineLink>
                <span className="px-1">/</span>
              </>
            ) : null}
            {pin.utcCreatedDateTime ? (
              <Link href={href} className="text-inherit hover:no-underline">
                <PostedTime value={pin.utcCreatedDateTime} serverTimeZone={serverTimeZone} />
              </Link>
            ) : null}
            {pin.user?.userName ? (
              <>
                <span className="px-1">/</span>
                <RefineLink field="user" value={pin.user.userName} className="inline-flex items-center gap-1 text-inherit hover:no-underline">
                  {pin.user.pictureUrl ? (
                    <UserAvatar userName={pin.user.userName} pictureUrl={pin.user.pictureUrl} className="size-4 text-[8px]" />
                  ) : null}
                  {pin.user.userName}
                </RefineLink>
              </>
            ) : null}
          </div>
          {pin.parentId || pin.rootThread ? (
            <Link href={href} title={pin.parentId ? 'Part of thread' : 'First pin in a thread'} className="text-muted">
              <Icon name="thread" className="size-3.5" />
            </Link>
          ) : null}
        </div>

        <h2 className="mx-2.5 mt-1 mb-2 font-display text-xl leading-snug">
          <Link href={href} className="text-ink hover:no-underline">
            {pin.title}
          </Link>
        </h2>

        {medium ? (
          <div className="relative mb-2.5">
            {pin.address ? (
              <span className="absolute top-2 right-2 z-10 max-w-[70%] truncate rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
                {pin.address}
              </span>
            ) : null}
            {company ? (
              <span className="absolute bottom-2 left-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">{company}</span>
            ) : null}
            <PinMedia medium={medium} title={pin.title} href={href} priority={priority} sizes={CARD_SIZES} />
          </div>
        ) : null}

        <div className="mx-2.5">
          {!medium && (company || pin.address) ? (
            <div className="mb-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
              {company}
              {pin.address ? <span>{pin.address}</span> : null}
            </div>
          ) : null}
          {pin.utcStartDateTime ? (
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted italic">
              <StartTime pin={pin} serverTimeZone={serverTimeZone} />
              <WeatherIcon pinId={pin.id} hasPlace={hasPlace} />
              {/* An unverified pin's reasoning only restates that nothing was found. */}
              <DateConfidence level={pin.dateConfidence} reasoning={pin.dateConfidenceReasoning} showReasoning={pin.dateConfidence !== 'unknown'} />
            </div>
          ) : null}
          {pin.safeDescription ? (
            <div className="rich-text text-[15px] leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: pin.safeDescription }} />
          ) : null}
        </div>

        {overflowing ? (
          <Link
            href={href}
            className="absolute right-0 bottom-0 left-0 bg-panel px-2.5 pt-0.5 text-right text-sm before:absolute before:-top-5 before:left-0 before:h-5 before:w-full before:bg-gradient-to-b before:from-transparent before:to-panel before:content-['']"
          >
            show more
          </Link>
        ) : null}
      </div>

      <div className="mx-2.5 mt-2 grid grid-cols-[1fr_auto_1fr] items-center">
        <div className={`text-sm ${pin.price != null && pin.price < 0 ? 'text-red-400' : 'text-green-400'}`}>
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
            <Link href={`/update/${pin.id}`} className="p-1 text-subtle hover:text-ink" title="Edit pin">
              <Icon name="pencil" className="size-4" />
            </Link>
          ) : null}
          <WatchButton pin={pin} />
        </div>
      </div>
    </article>
  );
}
