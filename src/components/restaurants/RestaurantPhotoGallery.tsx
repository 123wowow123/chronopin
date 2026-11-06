'use client';

import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from '@/components/ui/Link';
import { MediaArrow } from '@/components/ui/MediaArrow';
import { restaurantCardPhotos, type RestaurantCardPhoto } from '@/lib/restaurantPhotos';
import styles from './RestaurantGuide.module.css';

export function RestaurantPhotoGallery({ name, href, photos, badge }: { name: string; href: string; photos: (RestaurantCardPhoto | undefined)[]; badge?: ReactNode }) {
  const slides = restaurantCardPhotos(photos);
  const track = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; left: number; index: number; mouse: boolean; dx: number; horizontal?: boolean } | null>(null);
  const dragged = useRef(false);
  const [index, setIndex] = useState(0);
  const go = (next: number) => {
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

  return <div className={`${styles.photoGallery} group/media`} role="region" aria-roledescription="carousel" aria-label={`${name} photos`}>
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
      {slides.length ? slides.map((photo, position) => <Link key={photo.src} href={href} className={`${styles.photoLink} ${styles.photoSlide}`} aria-label={`View ${name}: ${photo.alt} (${position + 1} of ${slides.length})`} tabIndex={position === index ? 0 : -1} draggable={false} onClick={(event) => { if (dragged.current) event.preventDefault(); }}>
        <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw" className={styles.cardImage} draggable={false} />
        {photo.credit && <span className={styles.imageNote}>{photo.credit}</span>}
      </Link>) : <Link href={href} className={`${styles.photoLink} ${styles.photoSlide}`} aria-label={`View ${name}`}><span className={styles.photoPlaceholder} aria-hidden="true">✳</span></Link>}
    </div>
    {badge}
    {slides.length > 1 && <div className={styles.photoPagination}>
        <MediaArrow side="previous" label={`Previous photo of ${name}`} onStep={() => go(index - 1)} />
        <div className={styles.photoDots}>{slides.map((photo, position) => <button key={photo.src} type="button" aria-label={`Show photo ${position + 1} of ${name}`} aria-current={position === index ? 'true' : undefined} onClick={() => go(position)} />)}</div>
        <MediaArrow side="next" label={`Next photo of ${name}`} onStep={() => go(index + 1)} />
      </div>}
  </div>;
}
