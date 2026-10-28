'use client';

import { useState } from 'react';
import Anchor from '@/components/ui/Anchor';
import { Icon } from '@/components/ui/Icon';
import Link from '@/components/ui/Link';
import { CardImage } from '@/components/pin/CardImage';
import { CardLike } from '@/components/pin/CardLike';
import { pinTextDir } from '@/lib/i18n/config';
import { useT } from '@/lib/client/i18n';
import type { MessageKey } from '@/lib/i18n/translate';
import { pinPath } from '@/lib/seo';
import type { PinJson } from '@/lib/types';
import type { HotelReview } from '@/lib/pinHotel';
import { getResortPricePerNight, type TravelResortPin } from '@/lib/travel';
import { distanceKm, formatDistance } from '@/lib/distance';
import { usesImperial } from '@/lib/weather';
import type { ViewerPlace } from '@/lib/client/viewerPlace';
import { BestTimeToGoWidget } from './BestTimeToGoWidget';
import { TopActivitiesPane } from './TopActivitiesPane';
import styles from '@/components/restaurants/RestaurantGuide.module.css';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function reviewSourceLabel(review: HotelReview): string {
  if (review.title) {
    if (review.title.includes('Condé Nast Traveler') || review.title.includes('Conde Nast')) return 'Condé Nast';
    if (review.title.includes('Michelin')) return 'Michelin';
    if (review.title.includes('Forbes')) return 'Forbes';
    if (review.title.includes('Travel + Leisure')) return 'T+L';
    if (review.title.includes('Booking.com')) return 'Booking.com';
    if (review.title.includes('Tripadvisor')) return 'Tripadvisor';
    if (review.title.includes('Tatler')) return 'Tatler';
    if (review.title.includes('Telegraph')) return 'Telegraph';
    if (review.title.includes('Wallpaper')) return 'Wallpaper*';
    if (review.title.includes('Trip.com')) return 'Trip.com';
    if (review.title.includes('National Geographic') || review.title.includes('Nat Geo')) return 'Nat Geo';
    if (review.title.length <= 16) return review.title;
    return review.title.split(/[,:·–—]/)[0]?.trim().slice(0, 16) || 'Review';
  }
  return hostOf(review.url);
}

function picture(media: PinJson['media']) {
  // Prioritize high-resolution photo (type 1) with thumbName over video stills (type 3)
  const medium =
    media?.find((m) => String(m.type) === '1' && m.thumbName) ??
    media?.find((m) => m.thumbName) ??
    media?.[0];
  return {
    thumbName: medium?.thumbName,
    originalUrl: medium?.originalUrl ?? undefined,
    portrait: !!(medium?.thumbWidth && medium.thumbHeight && medium.thumbHeight > medium.thumbWidth * 1.2),
  };
}

function resortBlurb(pin: TravelResortPin): string {
  // Use first review quote if available
  const quote = pin.hotel.reviews?.[0]?.quote;
  if (quote) return quote;
  if (pin.hotel.basis) {
    const cut = pin.hotel.basis.split('. ')[0];
    return cut ? `${cut}.` : pin.hotel.basis;
  }
  const text = (pin.description ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= 160) return text || pin.title;
  const cut = text.slice(0, 160);
  const end = cut.lastIndexOf('. ');
  return end > 60 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, '')}…`;
}

export function ResortCard({
  resort,
  shelfLabel,
  activeSeasonMonths,
  activeSeasonLabel,
  viewerOrigin,
  showDistance,
}: {
  resort: TravelResortPin;
  shelfLabel: string;
  activeSeasonMonths?: readonly number[] | null;
  activeSeasonLabel?: string;
  viewerOrigin?: ViewerPlace;
  showDistance?: boolean;
}) {
  const t = useT();
  const gt = (key: string, values?: Record<string, string | number>) => t(`guides.travel.${key}` as MessageKey, values);
  const pic = picture(resort.media);
  const name = resort.productName ?? resort.title;
  const blurb = resortBlurb(resort);
  const hotel = resort.hotel;
  const price = resort.pricePerNight ?? getResortPricePerNight(
    resort.id,
    resort.priceLowerBound ?? resort.price,
    resort.priceCurrency,
    resort.priceUpperBound,
  );

  const axes = [
    { label: gt('rooms'), val: hotel.rooms },
    { label: gt('service'), val: hotel.service },
    { label: gt('location'), val: hotel.location },
    { label: gt('cleanliness'), val: hotel.cleanliness },
    { label: gt('value'), val: hotel.value },
  ].filter((a) => a.val !== null);

  const [activeReviewIdx, setActiveReviewIdx] = useState(0);
  const reviews = hotel.reviews ?? [];
  const currentReview = reviews[activeReviewIdx] ?? reviews[0];
  const activeQuote = currentReview?.quote ?? blurb;

  const distance =
    showDistance &&
    viewerOrigin &&
    resort.latitude != null &&
    resort.longitude != null &&
    Number.isFinite(resort.latitude) &&
    Number.isFinite(resort.longitude)
      ? distanceKm(viewerOrigin, { latitude: resort.latitude, longitude: resort.longitude })
      : undefined;

  return (
    <article className={styles.card} id={`resort-${resort.id}`}>
      <CardLike pin={resort} />
      {/* Photo & Badge */}
      <Link href={pinPath(resort)} className={styles.photoLink} aria-label={gt('view', { name })}>
        {pic.thumbName || pic.originalUrl ? (
          <CardImage
            thumbName={pic.thumbName}
            originalUrl={pic.originalUrl}
            alt={name}
            portrait={pic.portrait}
            className={styles.cardImage}
          />
        ) : (
          <span className={styles.photoPlaceholder} aria-hidden="true">
            ✳
          </span>
        )}
        <span className={styles.cardBadge}>{shelfLabel.toUpperCase()}</span>
      </Link>

      {/* Card Content */}
      <div className={styles.cardBody}>
        {/* Meta row: destination & overall score */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-[var(--soft)]">
            <span>{resort.destination}</span>
            {distance !== undefined && (
              <span className="ml-1.5 font-normal text-[var(--text)]" title={gt('approxDistance')}>
                {gt('away', { distance: formatDistance(distance, usesImperial()) })}
              </span>
            )}
            {showDistance && distance === undefined && (
              <span className="ml-1.5 font-normal text-[var(--soft)]">{gt('distanceUnavailable')}</span>
            )}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-500/25 ring-inset tabular-nums">
              <Icon name="star" className="size-3 text-amber-500 fill-amber-500" />
              <span>{resort.rubricScore.toFixed(1)}</span>
              <span className="font-normal text-amber-700/70">/5</span>
            </span>
          </div>
        </div>

        {/* Acclaim distinction pill if present */}
        {resort.acclaimLabel && (
          <div className="mb-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf0cf] px-2.5 py-1 text-[11px] font-semibold text-[#244d39] ring-1 ring-[#c8cfb4]">
              <Icon name="sparkle" className="size-3 text-[#244d39]" />
              <span>{resort.acclaimLabel}</span>
            </span>
          </div>
        )}

        {/* Resort Title */}
        <h3 className="mb-2.5">
          <Link href={pinPath(resort)} dir={pinTextDir(resort)} className="text-[var(--text)] hover:text-[var(--green)]">
            {name}
          </Link>
        </h3>

        {/* 5-axis rubric score pill chips */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {axes.map((ax) => (
            <span
              key={ax.label}
              className="inline-flex items-center gap-1 rounded bg-[var(--paper)] px-2 py-0.5 text-[10px] font-medium text-[var(--text)] ring-1 ring-[var(--rule)]"
            >
              <span className="text-[var(--soft)]">{ax.label}:</span>
              <strong>{ax.val}</strong>
            </span>
          ))}
          {hotel.acclaim !== null && (
            <span className="inline-flex items-center gap-1 rounded bg-[#edf0cf] px-2 py-0.5 text-[10px] font-semibold text-[#244d39] ring-1 ring-[#c8cfb4]">
              <span>{gt('acclaim')}</span>
              <strong>{hotel.acclaim}/5</strong>
            </span>
          )}
        </div>

        {/* Verified Reviews Section */}
        {reviews.length > 0 ? (
          <div className="mb-3 rounded-md border border-[var(--rule)] bg-[var(--paper)] p-3 text-xs">
            {/* Multi-review pills switcher if more than 1 review */}
            {reviews.length > 1 && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5 border-b border-[var(--rule)] pb-2 text-[10px]">
                <span className="font-semibold uppercase tracking-wider text-[var(--soft)]">
                  Reviews ({reviews.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {reviews.map((rev, idx) => {
                    const label = reviewSourceLabel(rev);
                    const isSelected = idx === activeReviewIdx;
                    return (
                      <button
                        key={rev.url || idx}
                        type="button"
                        onClick={() => setActiveReviewIdx(idx)}
                        aria-pressed={isSelected}
                        className={`cursor-pointer rounded-xs px-2 py-0.5 text-[9px] font-semibold transition-colors ${
                          isSelected
                            ? 'bg-[var(--green)] text-[#fffef0] shadow-xs'
                            : 'bg-[var(--paper-raised)] text-[var(--text)] border border-[var(--rule)] hover:bg-[var(--rule)]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Quote */}
            <p className="italic text-[var(--text)] leading-relaxed" dir={pinTextDir(resort)}>
              &ldquo;{activeQuote}&rdquo;
            </p>

            {/* Source citation link & date */}
            {currentReview && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] text-[var(--soft)]">
                <Anchor
                  href={currentReview.url}
                  target="_blank"
                  rel="noopener nofollow"
                  className="inline-flex items-center gap-0.5 font-medium text-[var(--green)] hover:underline"
                >
                  <span className="max-w-[200px] truncate">{currentReview.title || hostOf(currentReview.url)}</span>
                  <span aria-hidden="true">↗</span>
                </Anchor>
                {currentReview.publishedDate && (
                  <time dateTime={currentReview.publishedDate} className="text-[9px]">
                    {new Date(currentReview.publishedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </time>
                )}
              </div>
            )}
          </div>
        ) : blurb ? (
          <p className={`${styles.cardDescription} italic mb-3`} dir={pinTextDir(resort)}>
            &ldquo;{blurb}&rdquo;
          </p>
        ) : null}

        {/* Best Time to Go interactive widget */}
        <BestTimeToGoWidget
          timing={resort.bestTimeToGo}
          activeSeasonMonths={activeSeasonMonths}
          activeSeasonLabel={activeSeasonLabel}
          className="mb-3"
        />

        {/* Top activities pane */}
        {resort.topActivities && resort.topActivities.length > 0 && (
          <TopActivitiesPane activities={resort.topActivities} className="mb-3" />
        )}

        {/* Card Foot with nightly price & links - pinned to the bottom */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[var(--rule)] pt-3 text-xs">
          {price ? (
            <div className="flex items-baseline gap-1">
              {!price.isRange && <span className="text-[10px] text-[var(--soft)] font-medium">{gt('from')}</span>}
              <strong className="text-[13px] font-bold text-[var(--text)] tabular-nums">{price.formatted}</strong>
              <span className="text-[10px] text-[var(--soft)]">{gt('perNight')}</span>
            </div>
          ) : (
            <span className="text-[10px] text-[var(--soft)]">{gt('ratesOnRequest')}</span>
          )}
          <div className="flex items-center gap-3">
            <Link
              href={pinPath(resort)}
              className="inline-flex items-center gap-1 font-semibold text-[var(--green)] hover:underline"
            >
              <span>{gt('seeRubric')}</span>
              <span aria-hidden="true">↗</span>
            </Link>
            {resort.sourceUrl && (
              <Anchor
                href={resort.sourceUrl}
                target="_blank"
                rel="noopener nofollow"
                className="text-[11px] text-[var(--soft)] hover:text-[var(--text)] hover:underline"
              >
                <span>{gt('officialSite')}</span>
                <span aria-hidden="true" className="ml-0.5">↗</span>
              </Anchor>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
