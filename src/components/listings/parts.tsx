'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { blobUrl } from '@/lib/appConfig';
import { useT } from '@/lib/client/i18n';
import { INTL_LOCALES } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';
import type { ListingDetails, ListingKind, RatingSummary } from '@/lib/listings';

export const mediaUrl = (name: string) => blobUrl(name) ?? name;

export const fieldLabel = (t: Translator, name: string) => t.dynamic(`listing.fields.${name}`, name);
export const optionLabel = (t: Translator, field: string, value: string) => t.dynamic(`listing.options.${field}.${value}`, value);

// A listing's price in full ("$1,500", not the pins' "$1.5K"): free at 0.
export function listingMoney(t: Translator, value: number, currency = 'USD') {
  if (!value) return t('listing.free');
  return new Intl.NumberFormat(INTL_LOCALES[t.locale], { style: 'currency', currency, maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
}

type Priced = { kind: ListingKind; price: number | null; currency: string; details: ListingDetails };

// The price as the listing states it: a rent per month, a job's pay range
// per hour or year.
export function priceLine(t: Translator, listing: Priced): string {
  if (listing.price == null) return '';
  const { details } = listing;
  if (listing.kind === 'job') {
    const low = new Intl.NumberFormat(INTL_LOCALES[t.locale], { style: 'currency', currency: listing.currency, maximumFractionDigits: listing.price % 1 ? 2 : 0 }).format(listing.price);
    const high =
      typeof details.maxPay === 'number' && details.maxPay > listing.price
        ? new Intl.NumberFormat(INTL_LOCALES[t.locale], { style: 'currency', currency: listing.currency, maximumFractionDigits: details.maxPay % 1 ? 2 : 0 }).format(details.maxPay)
        : null;
    const range = high ? `${low}–${high}` : low;
    return details.payType ? t('listing.per', { price: range, unit: optionLabel(t, 'payUnit', String(details.payType)) }) : range;
  }
  const price = listingMoney(t, listing.price, listing.currency);
  return listing.kind === 'home' && details.offer === 'rent' && listing.price ? t('listing.per', { price, unit: optionLabel(t, 'payUnit', 'monthly') }) : price;
}

// A vehicle and a home are named by their details, in the reader's language
// for a home ("3 bed · 2 bath house").
export function listingTitle(t: Translator, listing: { kind: ListingKind; title: string; details?: ListingDetails }): string {
  const d = listing.details;
  if (listing.kind === 'home' && d?.propertyType != null && d.bedrooms != null) {
    return t('listing.homeTitle', { beds: Number(d.bedrooms), baths: Number(d.bathrooms ?? 0), type: optionLabel(t, 'propertyType', String(d.propertyType)) });
  }
  return listing.title;
}

// A listing's picture on a card: its first photo, or for one sold on a
// video alone that video's opening frame, or the tag when it has neither.
export function ListingCover({ photo, video, className = '', iconClassName = 'size-8' }: { photo: string | null | undefined; video: string | null | undefined; className?: string; iconClassName?: string }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element -- the seller's upload
    return <img src={mediaUrl(photo)} alt="" loading="lazy" className={`size-full object-cover ${className}`} />;
  }
  if (video) {
    return (
      <>
        {/* #t skips a black first frame; metadata only, so a list does not download every clip. */}
        <video src={`${mediaUrl(video)}#t=0.1`} muted playsInline preload="metadata" className={`size-full object-cover ${className}`} />
        <Icon name="play" className="pointer-events-none absolute inset-0 m-auto size-1/3 max-h-8 max-w-8 fill-current text-white/90 drop-shadow" />
      </>
    );
  }
  return <Icon name="tag" className={`absolute inset-0 m-auto text-subtle ${iconClassName}`} />;
}

// Filled, half and empty stars for a score out of five.
export function Stars({ value, className = 'size-3.5' }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center text-accent" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="relative inline-flex">
          <Icon name="star" className={`${className} text-line`} />
          {value >= n - 0.25 ? (
            <Icon name="star" className={`${className} absolute inset-0 fill-current`} />
          ) : value >= n - 0.75 ? (
            <span className="absolute inset-0 w-1/2 overflow-hidden">
              <Icon name="star" className={`${className} fill-current`} />
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

// "★★★★☆ 4.2 (7)", or "No ratings yet".
export function RatingBadge({ rating, className = '' }: { rating: RatingSummary; className?: string }) {
  const t = useT();
  if (!rating.count || rating.average == null) return <span className={`text-xs text-subtle ${className}`}>{t('listing.noRatings')}</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-xs text-muted ${className}`} title={t('listing.ratingTitle', { average: rating.average, count: rating.count })}>
      <Stars value={rating.average} />
      <span className="tabular-nums">{rating.average.toFixed(1)}</span>
      <span className="text-subtle tabular-nums">({rating.count})</span>
    </span>
  );
}

// A modal: over a shaded page, shut by Escape, a press outside or its ×.
export function Dialog({
  label,
  onClose,
  children,
  className = 'w-full max-w-lg',
  bare = false,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  // No title bar: the × floats over the corner (the listing form and view,
  // whose own headings say what they are).
  bare?: boolean;
}) {
  const t = useT();
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-shade/50 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={label} className={`floating relative flex max-h-[100dvh] flex-col overflow-hidden max-sm:h-[100dvh] max-sm:rounded-none sm:max-h-[92dvh] ${className}`}>
        {bare ? null : (
          <div className="border-b border-line px-14 py-3">
            <h2 className="text-center text-lg font-bold text-ink">{label}</h2>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          title={t('common.close')}
          className="absolute top-2.5 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-raised text-muted shadow-sm hover:bg-raised-2 hover:text-ink"
        >
          <Icon name="close" className="size-5" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
