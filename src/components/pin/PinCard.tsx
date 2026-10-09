'use client';

import Link from '@/components/ui/Link';
import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { PostedTime, StartDistance, StartTime } from '@/components/ui/LocalTime';
import { dayKeyIn, money } from '@/lib/format';
import { useTimeZone } from '@/lib/client/timeZone';
import { useNow } from '@/lib/client/now';
import { useVideoPoster } from '@/lib/client/timelineVideo';
import { pinPath } from '@/lib/seo';
import type { CardPin } from '@/lib/types';
import { useLeftOut } from '@/lib/client/leftOut';
import { undoNotInterested, useNotInterested } from '@/lib/client/notInterested';
import { pinEvidence } from '@/lib/referenceConfidence';
import type { PinTense } from '@/lib/timeline';
import { CitedText } from './CitedText';
import { DateConfidence, DateConfidenceReasoning } from './DateConfidence';
import { DelayBadge } from './DelayBadge';
import { PinConfidence } from './PinConfidence';
import { PinPillRow } from './PinPillRow';
import { RestaurantPriceRange } from './RestaurantPriceRange';
import { PinMenu } from './PinMenu';
import { PinDistance } from './PinDistance';
import { CompanyTicker } from './CompanyTicker';
import { PinCardOdds } from './PinOdds';
import { PinMediaFrame } from './PinMedia';
import { RatingSummary } from './PinRatings';
import { EpisodeCount } from './EpisodeCount';
import { RefineLink } from './RefineLink';
import { PlaceLinks } from './PlaceLinks';
import { ViewCount } from './ViewCount';
import { WatchButton } from './WatchButton';
import { WeatherIcon } from './WeatherIcon';
import { useT } from '@/lib/client/i18n';
import { pinTextDir } from '@/lib/i18n/config';
import { categoryLabel } from '@/lib/i18n/labels';

const CARD_SIZES = '(max-width: 640px) 100vw, 448px';

// How recent a pin's newest update must be for its card to say UPDATED.
const UPDATED_WITHIN_MS = 24 * 60 * 60 * 1000;

// The NEW and UPDATED pills beside the title; each tap target grows past the
// small pill (DelayBadge does the same).
const STATUS_PILL =
  "relative shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] hover:no-underline";

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
  const t = useT();
  const leftOut = useLeftOut()(pin);
  const justHidden = useNotInterested().justHidden.has(pin.id);
  const href = pinPath(pin);
  const media = pin.media ?? [];
  const hasPlace = pin.latitude != null && pin.longitude != null;
  // Posted on the viewer's own current day (the same day posted: searches use).
  const timeZone = useTimeZone(serverTimeZone);
  // 0 on the server and during hydration, so the pills come with the client's clock.
  const now = useNow(60_000);
  const today = dayKeyIn(now, timeZone);
  const postedToday = now > 0 && !!pin.utcCreatedDateTime && dayKeyIn(pin.utcCreatedDateTime, timeZone) === today;
  // Updated (PinUpdate) in the last 24 hours. A pin new today says only NEW.
  const updatedRecently = now > 0 && !postedToday && !!pin.utcLastUpdateDateTime && now - new Date(pin.utcLastUpdateDateTime).getTime() < UPDATED_WITHIN_MS;

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

  // Company and place for a pin without a medium to label: the company in the
  // same pill the pin page uses for its chips, the place as its parts, each
  // a search for the pins standing there. Over a picture the place stays
  // plain text - the frame is itself a link to the pin, and a link cannot
  // hold another.
  const placeRow =
    company || pin.address ? (
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        {company ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-0.5 font-medium ring-1 ring-tint/15 ring-inset">
            {company}
            <CompanyTicker pin={pin} />
          </span>
        ) : null}
        {pin.address ? <PlaceLinks address={pin.address} /> : null}
      </div>
    ) : null;

  // By someone the reader blocked (0076), or marked "Not interested" (0077)
  // on an earlier page: shown nowhere - the timeline and search leave the
  // slot out too, and "More like this" skips it here.
  if (leftOut) return null;
  // Marked on this page: folded to a line, with Undo.
  if (justHidden) {
    return (
      <article className="surface flex items-center justify-between gap-3 px-3 py-3 text-sm text-subtle">
        <span>{t('pin.hiddenNotice')}</span>
        <button type="button" onClick={() => void undoNotInterested(pin.id).catch(() => {})} className="btn btn-sm btn-secondary shrink-0">
          {t('pin.undo')}
        </button>
      </article>
    );
  }

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
                  {categoryLabel(t, pin.categories[0])}
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
            {/* How far the pin stands from the reader, once their browser
                knows where that is. It is the row's last item and the one
                that gives, cut short rather than wrapping the row (see
                PinDistance). Nothing stands in for it while it is unknown,
                or the row would show the dot before an empty item. */}
            {pin.latitude != null && pin.longitude != null ? <PinDistance pinId={pin.id} latitude={pin.latitude} longitude={pin.longitude} compact /> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
          {/* NEW searches for every pin posted today, UPDATED for every pin
              updated since the day 24 hours back - both days the viewer's. */}
          {pin.curated ? (
            <RefineLink field="tag" value="Curated" className={`${STATUS_PILL} bg-accent/15 text-accent hover:bg-accent/25`} title={t('card.curatedTitle')}>
              {t('card.curated')}
            </RefineLink>
          ) : null}
          {postedToday ? (
            <RefineLink field="posted" value={today} className={`${STATUS_PILL} bg-link/15 text-link hover:bg-link/25`} title={t('card.newTitle')}>
              {t('card.new')}
            </RefineLink>
          ) : updatedRecently ? (
            <RefineLink
              field="updated"
              value={`>=${dayKeyIn(now - UPDATED_WITHIN_MS, timeZone)}`}
              className={`${STATUS_PILL} bg-success/15 text-success hover:bg-success/25`}
              title={t('card.updatedTitle')}
            >
              {t('card.updated')}
            </RefineLink>
          ) : null}
            {pin.parentId || pin.rootThread ? (
              <Link href={href} title={pin.parentId ? t('card.partOfThread') : t('card.firstInThread')} className="text-subtle hover:text-ink">
                <Icon name="thread" className="size-3.5" />
              </Link>
            ) : null}
            <span className="-my-1.5 -me-1.5">
              <PinMenu pin={pin} buttonClassName="size-7" iconClassName="size-4" />
            </span>
          </div>
        </div>

        <div className="mx-3 mt-2.5 mb-2.5 flex items-start justify-between gap-2">
          <h2 dir={pinTextDir(pin)} className="min-w-0 font-display text-[19px] leading-snug font-medium tracking-tight text-pretty">
            <Link href={href} className="text-ink transition-colors hover:text-link hover:no-underline">
              {pin.title}
            </Link>
          </h2>
        </div>

        {media.length ? (
          <PinMediaFrame
            key={media.map((m) => m.originalUrl ?? m.thumbName).join(' ')}
            // A tall picture (a poster) is cropped to its middle, leaving room under
            // it for the start date and some description before the cut-off.
            className="relative mb-3 overflow-hidden bg-black [&_img]:max-h-[260px] [&_img]:object-cover [&_img]:transition-transform [&_img]:duration-[400ms] [&_img]:ease-out hover:[&_img]:scale-[1.025] motion-reduce:[&_img]:transition-none motion-reduce:hover:[&_img]:scale-100"
            overlay={
              <>
                {pin.address ? <span className="media-chip absolute top-2 end-2 z-10 max-w-[70%] truncate">{pin.address}</span> : null}
                {company ? (
                  <span className="media-chip absolute bottom-2 start-2 z-10 inline-flex items-center gap-1.5">
                    {company}
                    <CompanyTicker pin={pin} onDark />
                  </span>
                ) : null}
              </>
            }
            fallback={<div className="mx-3">{placeRow}</div>}
            media={media}
            card
            title={pin.title}
            href={href}
            priority={priority}
            poster={poster}
            sizes={CARD_SIZES}
          />
        ) : null}

        <div className="mx-3">
          {!media.length ? placeRow : null}
          {pin.utcStartDateTime || pin.ratings?.length || pin.episodeCount ? (
            <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <PinPillRow>
                {pin.utcStartDateTime ? (
                  <>
                    <StartTime pin={pin} serverTimeZone={serverTimeZone} search />
                    <WeatherIcon pinId={pin.id} hasPlace={hasPlace} />
                    <DateConfidence level={pin.dateConfidence} />
                    <DelayBadge pin={pin} search />
                    <PinConfidence evidence={pinEvidence(pin)} />
                  </>
                ) : null}
                {/* The review-site average, for a film, series or anime pin, or
                    the one source's own score where that is all the pin has -
                    a card lists no sources beside it, same as a thread row. */}
                <RatingSummary ratings={pin.ratings} search />
                {/* How many episodes, for a series, anime or other episodic work. */}
                <EpisodeCount pin={pin} compact />
                {/* How far the start is from today, at the tail of the pills. */}
                {pin.utcStartDateTime && todayKey ? <StartDistance pin={pin} todayKey={todayKey} serverTimeZone={serverTimeZone} /> : null}
              </PinPillRow>
              {/* Last, on a line of its own. An unverified pin's reasoning only restates
                  that nothing was found, so it stays hidden. */}
              {pin.utcStartDateTime && pin.dateConfidence !== 'unknown' ? (
                <DateConfidenceReasoning reasoning={pin.dateConfidenceReasoning} dir={pinTextDir(pin)}>
                  {pin.dateConfidenceReasoning && pin.id ? <CitedText text={pin.dateConfidenceReasoning} evidence={pinEvidence(pin)} hrefBase={href} /> : undefined}
                </DateConfidenceReasoning>
              ) : null}
            </div>
          ) : null}
          <PinCardOdds pin={pin} />
          {pin.safeDescription ? (
            <div dir={pinTextDir(pin)} className="rich-text text-[15px] leading-relaxed text-ink/90" dangerouslySetInnerHTML={{ __html: pin.safeDescription }} />
          ) : null}
        </div>

        {overflowing ? (
          <Link
            href={href}
            className="absolute end-0 bottom-0 start-0 bg-[var(--card-bg,var(--color-panel))] px-3 pt-0.5 text-end text-sm font-medium before:absolute before:-top-8 before:start-0 before:h-8 before:w-full before:bg-gradient-to-b before:from-transparent before:to-[var(--card-bg,var(--color-panel))] before:content-['']"
          >
            {t('card.showMore')}
          </Link>
        ) : null}
      </div>

      <div className="mx-3 mt-2.5 grid grid-cols-[1fr_auto_1fr] items-center border-t border-line pt-1.5">
        <div className={`text-sm font-medium tabular-nums ${pin.price != null && pin.price < 0 ? 'text-danger' : 'text-success'}`}>
          {pin.price ? money(pin.price, pin.priceCurrency) : null}
          {pin.restaurantPriceRange ? <span className="text-xs text-muted"><RestaurantPriceRange range={pin.restaurantPriceRange} /></span> : null}
        </div>
        <div>
          {pin.searchScore != null ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-subtle" title={t('card.searchScoreTitle')}>
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
