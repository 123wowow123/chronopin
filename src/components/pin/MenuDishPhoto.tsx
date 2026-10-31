'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import type { RestaurantDishImage } from '@/lib/restaurantMenus';
import styles from './RestaurantMenu.module.css';

function Lightbox({ images, start, onClose }: { images: RestaurantDishImage[]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const count = images.length;
  const step = useCallback((by: number) => setIndex((current) => (current + by + count) % count), [count]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === 'ArrowRight') step(1);
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose, step]);
  const image = images[index];
  return (
    <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={image.caption} onClick={onClose}>
      <figure className={styles.lightboxFigure} onClick={(event) => event.stopPropagation()}>
        <Image key={image.src} src={image.src} alt={image.caption} width={image.width ?? 1200} height={image.height ?? 900} sizes="90vw" className={styles.lightboxImg} />
        <figcaption className={styles.lightboxCaption}>
          <strong>{image.caption}</strong>
          <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer">Photo: {image.credit} ↗</a>
          {count > 1 ? <span className={styles.lightboxCount}>{index + 1} / {count}</span> : null}
        </figcaption>
        <button type="button" className={styles.lightboxClose} onClick={onClose} aria-label="Close photo">×</button>
        {count > 1 ? (
          <>
            <button type="button" className={`${styles.lightboxNav} ${styles.lightboxPrev}`} onClick={() => step(-1)} aria-label="Previous photo">‹</button>
            <button type="button" className={`${styles.lightboxNav} ${styles.lightboxNext}`} onClick={() => step(1)} aria-label="Next photo">›</button>
          </>
        ) : null}
      </figure>
    </div>
  );
}

// A dish's thumbnail; clicking opens the photo large, with arrows through the menu list's other dish photos in order.
export function MenuDishPhoto({ name, gallery, index }: { name: string; gallery: RestaurantDishImage[]; index: number }) {
  const [open, setOpen] = useState(false);
  const image = gallery[index];
  return (
    <>
      <button type="button" className={styles.dishThumb} onClick={() => setOpen(true)} aria-label={`Enlarge photo of ${name}`}>
        <Image src={image.src} alt={image.caption} width={96} height={96} sizes="48px" className={styles.dishThumbImg} />
      </button>
      {open ? <Lightbox images={gallery} start={index} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// Every dish photo of a restaurant pin as one captioned strip above the menu.
export function FoodPhotoStrip({ images }: { images: RestaurantDishImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className={styles.foodStrip}>
      <h3 className={styles.menuTitle}>Food photos</h3>
      <ul className={styles.foodStripList}>
        {images.map((image, index) => (
          <li key={image.src} className={styles.foodStripItem}>
            <button type="button" className={styles.foodStripButton} onClick={() => setOpen(index)} aria-label={`Enlarge photo: ${image.caption}`}>
              <Image src={image.src} alt={image.caption} width={240} height={180} sizes="120px" className={styles.foodStripImg} />
            </button>
            <span className={styles.foodStripCaption}>{image.caption}</span>
          </li>
        ))}
      </ul>
      {open != null ? <Lightbox images={images} start={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
