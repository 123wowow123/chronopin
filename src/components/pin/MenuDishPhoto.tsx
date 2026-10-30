'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { RestaurantDishImage } from '@/lib/restaurantMenus';
import styles from './RestaurantMenu.module.css';

function Lightbox({ image, onClose }: { image: RestaurantDishImage; onClose: () => void }) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={image.caption} onClick={onClose}>
      <figure className={styles.lightboxFigure} onClick={(event) => event.stopPropagation()}>
        <Image src={image.src} alt={image.caption} width={image.width ?? 1200} height={image.height ?? 900} sizes="90vw" className={styles.lightboxImg} />
        <figcaption className={styles.lightboxCaption}>
          <strong>{image.caption}</strong>
          <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer">Photo: {image.credit} ↗</a>
        </figcaption>
        <button type="button" className={styles.lightboxClose} onClick={onClose} aria-label="Close photo">×</button>
      </figure>
    </div>
  );
}

// A dish's thumbnail; clicking opens the photo large with its caption and credit.
export function MenuDishPhoto({ name, image }: { name: string; image: RestaurantDishImage }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={styles.dishThumb} onClick={() => setOpen(true)} aria-label={`Enlarge photo of ${name}`}>
        <Image src={image.src} alt={image.caption} width={96} height={96} sizes="48px" className={styles.dishThumbImg} />
      </button>
      {open ? <Lightbox image={image} onClose={() => setOpen(false)} /> : null}
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
      {open != null ? <Lightbox image={images[open]} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
