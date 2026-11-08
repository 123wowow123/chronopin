'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Anchor from '@/components/ui/Anchor';
import { useMenuItemReviewSummary } from '@/lib/client/menuItemReviewSummaries';
import { Icon } from '@/components/ui/Icon';
import { restaurantDishImages, type RestaurantMenuItem } from '@/lib/restaurantMenus';
import { inferredMenuItemRating, inferredReviewRating } from '@/lib/restaurantReviewRatings';
import { PinMediaFrame } from './PinMedia';
import { PinReviews } from './PinReviews';
import styles from './RestaurantMenu.module.css';

export function MenuItemReviews({ pinId, item, children, gallery = [], photoOnly = false, hideEmpty = true }: { pinId?: number | null; item: RestaurantMenuItem; children?: ReactNode; gallery?: RestaurantMenuItem[]; photoOnly?: boolean; hideEmpty?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  // Keep the review form unmounted until opened; a long menu makes no per-dish requests.
  const [open, setOpen] = useState(false);
  const summary = useMenuItemReviewSummary(pinId, item.name.trim());
  const count = (item.reviews?.length ?? 0) + (summary?.count ?? 0);
  const estimates = (item.reviews ?? []).map(inferredReviewRating).filter((r): r is number => r != null);
  const readerCount = summary?.average == null ? 0 : summary.count;
  const fill: 'empty' | 'half' | 'solid' = readerCount && estimates.length ? 'half' : readerCount ? 'solid' : 'empty';
  const rating = readerCount && estimates.length
    ? (summary!.average! * readerCount + estimates.reduce((t, r) => t + r, 0)) / (readerCount + estimates.length)
    : summary?.average ?? inferredMenuItemRating(item.reviews);
  const label = rating != null ? fill === 'half'
    ? `${item.name}: approximately ${rating.toFixed(1)} out of 5, mixing ${readerCount} reader ${readerCount === 1 ? 'rating' : 'ratings'} with ${estimates.length} ${estimates.length === 1 ? 'estimate' : 'estimates'} inferred from external review text`
    : fill === 'empty'
    ? `${item.name}: approximately ${rating.toFixed(1)} out of 5, inferred from external review text; not a source-published rating`
    : `${item.name}: ${rating.toFixed(1)} out of 5 from ${summary!.count} reader ${summary!.count === 1 ? 'rating' : 'ratings'}`
    : count ? `${count} ${count === 1 ? 'review' : 'reviews'} for ${item.name} — not yet rated`
    : summary === undefined ? `Check reviews for ${item.name}` : `No reviews yet for ${item.name} — be the first`;
  const image = restaurantDishImages(item)[0];
  const canReview = !!pinId || !!item.reviews?.length;
  return <>
    {image ? <button type="button" className={photoOnly ? styles.foodStripButton : styles.dishThumb} onClick={() => setOpen(true)} aria-label={`Photo and reviews for ${item.name}`} aria-haspopup="dialog">
      <Image src={image.src} alt={image.caption} width={photoOnly ? 240 : 96} height={photoOnly ? 180 : 96} sizes={photoOnly ? '120px' : '48px'} className={photoOnly ? styles.foodStripImg : styles.dishThumbImg} />
    </button> : null}
    {children ? <button type="button" className={styles.reviewText} aria-haspopup="dialog" aria-label={`View ${image ? 'photo and ' : ''}reviews for ${item.name}`} onClick={() => setOpen(true)}>{children}</button> : null}
    {!photoOnly && canReview && (!hideEmpty || count > 0) ? <button type="button" className={styles.reviewButton} data-has-reviews={count > 0} data-rated={rating != null} aria-label={label} title={label} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <RatingStar fill={rating == null ? 'empty' : fill} />
      {rating != null ? <span className={styles.reviewRating} aria-hidden="true">{rating.toFixed(1)}<small>/5</small></span> : null}
    </button> : null}
    {open && createPortal(<ReviewDialog dialogRef={dialog} heading={heading} item={item} gallery={gallery} pinId={pinId} onClose={() => setOpen(false)} />, document.body)}
  </>;
}

function ReviewDialog({ dialogRef, heading, item: initialItem, gallery, pinId, onClose }: { dialogRef: RefObject<HTMLDialogElement | null>; heading: string; item: RestaurantMenuItem; gallery: RestaurantMenuItem[]; pinId?: number | null; onClose: () => void }) {
  const [selected, setSelected] = useState(initialItem);
  const item = selected;
  const index = gallery.findIndex((entry) => entry.name === item.name && entry.image?.src === item.image?.src);
  const canNavigate = index >= 0 && gallery.length > 1;
  const step = useCallback((by: number) => {
    if (canNavigate) setSelected(gallery[(index + by + gallery.length) % gallery.length]);
  }, [canNavigate, gallery, index]);
  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.closest('input, textarea, select, [data-media-carousel]') || target.isContentEditable)) return;
      if (!canNavigate || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      event.stopPropagation();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    };
    dialogRef.current?.addEventListener('keydown', navigate);
    const element = dialogRef.current;
    return () => element?.removeEventListener('keydown', navigate);
  }, [canNavigate, step, dialogRef]);
  useEffect(() => {
    dialogRef.current?.showModal();
    // The navbar's document capture listener consumes Escape. Handle this
    // top-layer modal first, even if a navbar layer hydrates after it opens.
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dialogRef.current?.close();
    };
    window.addEventListener('keydown', close, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', close, true); document.body.style.overflow = overflow; };
  }, [dialogRef]);
  return <dialog ref={dialogRef} aria-labelledby={heading} className={styles.reviewDialog} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
    <div className={styles.reviewDialogBody}>
      <div className={styles.reviewDialogHeading}><div><p className={styles.reviewEyebrow}>On the menu</p><h2 id={heading}>{item.name}</h2></div><button type="button" aria-label="Close reviews" onClick={() => dialogRef.current?.close()}><Icon name="close" className="size-5" /></button></div>
      <div className={styles.reviewDialogColumns}>
      <div className={styles.reviewDialogMedia}>
      <DishPhotoGallery key={item.name} item={item} />
      {canNavigate ? <nav aria-label="Dish photos" className={styles.reviewPhotoNavigation}>
        <button type="button" aria-label="Previous dish" onClick={() => step(-1)}>‹ Previous</button>
        <button type="button" aria-label="Next dish" onClick={() => step(1)}>Next ›</button>
      </nav> : null}
      </div>
      <div className={styles.reviewDialogReviews}>
      <h3 className={styles.reviewSectionTitle}>External reviews</h3>
      {item.reviews?.length ? <ul className={styles.reviewSources}>{item.reviews.map((review) => <li key={review.sourceUrl} className={styles.reviewSourceCard}>
        <div className={styles.reviewSourceHeader}>
          <div className={styles.reviewSourceMeta}><span>{review.provider}</span>{review.publishedDate && <time dateTime={review.publishedDate}>{review.publishedDate}</time>}</div>
          <InferredRatingBadge rating={inferredReviewRating(review)} />
        </div>
        <blockquote>“{review.quote}”</blockquote>
        <Anchor href={review.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.reviewSourceLink}><span>{review.title}</span><span aria-hidden="true">↗</span></Anchor>
      </li>)}</ul> : <p className={styles.reviewEmpty}>No external reviews yet.</p>}
      {pinId ? <PinReviews key={item.name} pinId={pinId} menuItem={item.name.trim()} /> : null}
      </div>
      </div>
    </div>
  </dialog>;
}

function RatingStar({ fill }: { fill: 'empty' | 'half' | 'solid' }) {
  return <span className={styles.reviewStar} data-fill={fill} aria-hidden="true">
    <Icon name="star" />
    {fill === 'half' ? <Icon name="star" className={styles.reviewStarHalf} /> : null}
  </span>;
}

function InferredRatingBadge({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  const label = `Approximately ${rating.toFixed(1)} out of 5 — inferred from this excerpt, not rated by the source`;
  return <span className={styles.reviewEstimate} role="img" aria-label={label} title={label}>
    <RatingStar fill="empty" />
    <span aria-hidden="true">{rating.toFixed(1)}<small>/5</small></span>
  </span>;
}

function DishPhotoGallery({ item }: { item: RestaurantMenuItem }) {
  const images = restaurantDishImages(item);
  if (!images.length) return null;
  return <figure className={styles.reviewPhoto} aria-label={`${item.name} photos`}>
    <PinMediaFrame className={styles.reviewPhotoFrame} media={images.map((image) => ({ type: 1, originalUrl: image.src, originalWidth: image.width, originalHeight: image.height }))}
      title={item.name} sizes="(max-width: 640px) 90vw, 600px" overlay={null} fallback={null} selectable
      renderCaption={(medium) => {
        const image = images.find((image) => image.src === medium.originalUrl)!;
        return <figcaption><span>{image.caption}</span><Anchor href={image.sourceUrl} target="_blank" rel="noopener noreferrer">{image.credit} ↗</Anchor></figcaption>;
      }} />
  </figure>;
}
