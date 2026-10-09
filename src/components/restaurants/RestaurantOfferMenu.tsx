'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import Anchor from '@/components/ui/Anchor';
import type { RestaurantMenu } from '@/lib/restaurantMenus';
import styles from './RestaurantGuide.module.css';

export function RestaurantOfferMenu({ menu, restaurant }: { menu?: RestaurantMenu; restaurant: string }) {
  const id = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  if (!menu) return null;
  const categories = [...new Set(menu.items.map((item) => item.category || 'Menu'))];
  const category = categories.find((category) => category === selected) ?? categories[0];
  const items = menu.items.filter((item) => (item.category || 'Menu') === category);
  const shown = expanded ? items : items.slice(0, 6);
  const amount = (price: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(price) ? 0 : 2 }).format(price);
  const source = menu.documentUrl || menu.url;

  return <div className={styles.offerMenuBlock}>
    <div className={styles.offerMenuHeading}>
      <h5>{menu.coverage === 'sample' ? 'Specials menu · selected items' : 'Specials menu'}</h5>
      <Anchor href={source} target="_blank" rel="noopener noreferrer">Published menu ↗</Anchor>
    </div>
    {categories.length > 1 && <div className={styles.offerMenuCategories} role="group" aria-label={`${restaurant} specials menu sections`}>
      {categories.map((categoryName) => <button key={categoryName} type="button" aria-pressed={category === categoryName} onClick={() => { setSelected(categoryName); setExpanded(false); }}>{categoryName}</button>)}
    </div>}
    {shown.length > 0 ? <>
      <ul id={id} className={styles.offerMenu} aria-label={`${restaurant} ${category} specials`}>
        {shown.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}{item.note && <small>{item.note}</small>}</span><strong>{item.priceLabel ?? (item.price != null ? amount(item.price) : 'Price not published')}</strong></li>)}
      </ul>
      {items.length > 6 && <button type="button" className={styles.offerMenuExpand} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((expanded) => !expanded)}>{expanded ? 'Show fewer items' : `Show all ${items.length} items`}</button>}
    </> : menu.pages?.length ? <div className={styles.offerMenuPages}>
      {menu.pages.map((page, index) => <Anchor key={page.src} href={page.src} target="_blank" rel="noopener noreferrer"><Image src={page.src} width={page.width} height={page.height} unoptimized alt={`${restaurant} ${menu.label} — ${page.label || `page ${index + 1}`}`} /></Anchor>)}
    </div> : <p className={styles.offerMenuMissing}>Item details haven’t been added yet. <Anchor href={source} target="_blank" rel="noopener noreferrer">Open the published menu ↗</Anchor></p>}
  </div>;
}
