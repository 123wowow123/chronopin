'use client';

import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from '@/components/ui/Link';
import { MediaArrow } from '@/components/ui/MediaArrow';
import { restaurantCardPhotos, type RestaurantCardPhoto } from '@/lib/restaurantPhotos';
import styles from '@/components/restaurants/RestaurantGuide.module.css';
import { CardImage } from './CardImage';
import { PinMedia } from './PinMedia';
import { landingMediaSlides } from '@/lib/landingMedia';
import type { MediumJson } from '@/lib/types';

export function LandingMediaGallery({ name, href, photos = [], media = [], badge, className = '', children }: { name: string; href: string; photos?: (RestaurantCardPhoto | undefined)[]; media?: MediumJson[]; badge?: ReactNode; className?: string; children?: ReactNode }) {
  const slides: (RestaurantCardPhoto & { medium?: MediumJson })[] = restaurantCardPhotos([...photos, ...landingMediaSlides(media, name)]);
  const [playing, setPlaying] = useState<string>();
  const track = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; left: number; index: number; mouse: boolean; dx: number; horizontal?: boolean } | null>(null);
  const dragged = useRef(false);
  const [index, setIndex] = useState(0);
  const go = (next: number) => {
    setPlaying(undefined);
    const element = track.current;
    if (!element) return;
    const target = (next + slides.length) % slides.length;
    element.scrollTo({ left: target * element.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  const finishDrag = (id: number) => {
    const start = pointer.current;
    if (!start || start.id !== id) return;
    pointer.current = null;
    if (track.current) delete track.current.dataset.dragging;
    if (start.mouse && start.horizontal) {
      go(start.index + (Math.abs(start.dx) > 40 ? (start.dx < 0 ? 1 : -1) : 0));
    }
  };

  return <div dir="ltr" className={`${styles.photoGallery} group/media ${className}`} role="region" aria-roledescription="carousel" aria-label={`${name} media`}>
    <div ref={track} className={styles.photoTrack} data-swipeable={slides.length > 1 || undefined} onScroll={(event) => {
      const element = event.currentTarget;
      setIndex(Math.round(element.scrollLeft / (element.clientWidth || 1)));
    }} onPointerDown={(event) => {
      dragged.current = false;
      if (slides.length < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const element = event.currentTarget;
      pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: element.scrollLeft, index: Math.round(element.scrollLeft / element.clientWidth), mouse: event.pointerType !== 'touch', dx: 0 };
    }} onPointerMove={(event) => {
      const start = pointer.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (start.horizontal === undefined) {
        if (Math.hypot(dx, dy) <= 8) return;
        start.horizontal = Math.abs(dx) > Math.abs(dy);
        if (!start.horizontal) { pointer.current = null; return; }
      }
      start.dx = dx;
      dragged.current = true;
      // Touch scrolling remains native, including vertical page scroll and pinch zoom.
      if (!start.mouse) return;
      event.preventDefault();
      const element = event.currentTarget;
      element.dataset.dragging = 'true';
      if (!element.hasPointerCapture(event.pointerId)) element.setPointerCapture(event.pointerId);
      element.scrollLeft = start.left - dx;
    }} onPointerUp={(event) => finishDrag(event.pointerId)} onPointerCancel={(event) => finishDrag(event.pointerId)} onLostPointerCapture={(event) => finishDrag(event.pointerId)} onClickCapture={(event) => {
      if (!dragged.current) return;
      dragged.current = false;
      event.preventDefault();
      event.stopPropagation();
    }} onDragStart={(event) => event.preventDefault()} onKeyDown={(event) => {
      if (slides.length < 2) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        go(index + (event.key === 'ArrowLeft' ? -1 : 1));
      }
    }}>
      {slides.length ? slides.map((photo, position) => {
        const medium = photo.medium;
        const isClip = medium && String(medium.type) !== '1';
        const image = medium ? <CardImage thumbName={medium.thumbName} originalUrl={String(medium.type) === '1' ? medium.originalUrl : undefined} alt={photo.alt} portrait={Boolean(medium.thumbWidth && medium.thumbHeight && medium.thumbHeight > medium.thumbWidth * 1.2)} className={styles.cardImage} /> : <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw" className={styles.cardImage} draggable={false} />;
        return <div key={photo.src} className={`${styles.photoSlide} ${styles.landingSlide}`}>
          {isClip && playing === photo.src && position === index ? <div className={styles.landingPlayer}><PinMedia medium={medium} title={name} sizes="(max-width: 600px) 100vw, 33vw" /></div> : isClip ? <button type="button" className={`${styles.photoLink} ${styles.landingSlideLink}`} aria-label={`Play media ${position + 1} of ${name}`} tabIndex={position === index ? 0 : -1} onClick={() => setPlaying(photo.src)}>{image}<span className={styles.landingPlay} aria-hidden="true">▶</span></button> : <Link href={href} className={`${styles.photoLink} ${styles.landingSlideLink}`} aria-label={`View ${name}: ${photo.alt} (${position + 1} of ${slides.length})`} tabIndex={position === index ? 0 : -1} draggable={false}>{image}</Link>}
          {photo.caption && <span className={styles.slideCaption}>{photo.caption}</span>}
          {photo.credit && <span className={styles.imageNote}>{photo.credit}</span>}
        </div>;
      }) : <Link href={href} className={`${styles.photoLink} ${styles.photoSlide}`} aria-label={`View ${name}`}><span className={styles.photoPlaceholder} aria-hidden="true">✳</span></Link>}

    </div>
    {badge}
    {children}
    {slides.length > 1 && <div className={styles.photoPagination}>
        <MediaArrow side="previous" label={`Previous photo of ${name}`} onStep={() => go(index - 1)} />
        <div className={styles.photoDots}>{slides.map((photo, position) => <button key={photo.src} type="button" aria-label={`Show photo ${position + 1} of ${name}`} aria-current={position === index ? 'true' : undefined} onClick={() => go(position)} />)}</div>
        <MediaArrow side="next" label={`Next photo of ${name}`} onStep={() => go(index + 1)} />
      </div>}
  </div>;
}
