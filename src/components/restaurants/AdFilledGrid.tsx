'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { useAds } from '@/components/ads/AdBlock';
import { SLOT_COUNT } from '@/lib/ads';
import { RestaurantAdCard, useRestaurantCardAds } from './RestaurantAdCard';
import styles from './RestaurantGuide.module.css';

// An ad card after every eighth card.
const AD_CARD_EVERY = 8;

// The card grid of a curated page (restaurant guides, products): its cards,
// with ad cards (the 'card-grid' placement) mixed in after every eighth card
// and - once the whole list is here (`complete`) - as many more at the end as
// it takes to leave no row short. The columns are read from the grid itself,
// so the fill follows the screen: three, two or one to a row.
export function AdFilledGrid({ cards, complete = true, className = styles.cardGrid }: { cards: ReactNode[]; complete?: boolean; className?: string }) {
  const loaded = cards.length;
  const adsOn = useRestaurantCardAds();
  const [columns, setColumns] = useState(1);
  const mids = Math.floor((loaded - 1) / AD_CARD_EVERY);
  const wanted = adsOn && loaded > 0 ? Math.min(SLOT_COUNT['card-grid'], mids + (complete ? columns - 1 : 0)) : 0;
  const { ref, ads } = useAds('card-grid', undefined, wanted);
  useEffect(() => {
    const grid = ref.current;
    if (!adsOn || !grid) return;
    const measure = () => setColumns(Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').length));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [adsOn, ref]);
  // How many ads go mid-list and at the end: the most mid-list ones that
  // still let the last row be filled from the ads there are.
  const available = adsOn ? (ads?.length ?? 0) : 0;
  let midCount = Math.min(mids, available);
  let fillCount = 0;
  const gap = (m: number) => (!complete || loaded === 0 ? 0 : (columns - ((loaded + m) % columns)) % columns);
  for (let m = midCount; m >= 0; m--) {
    if (m + gap(m) <= available) { midCount = m; fillCount = gap(m); break; }
    if (m === 0) { midCount = 0; fillCount = Math.min(gap(0), available); }
  }
  const adAfter = (index: number) => {
    if (!ads || !adsOn) return null;
    const nth = (index + 1) / AD_CARD_EVERY;
    const mid = Number.isInteger(nth) && index < loaded - 1 && nth <= midCount;
    const placed = mid ? [ads[nth - 1]] : index === loaded - 1 ? ads.slice(midCount, midCount + fillCount) : [];
    return placed.map((ad) => <RestaurantAdCard key={ad.key} ad={ad} />);
  };
  return <div ref={adsOn ? ref : undefined} className={className}>{cards.map((card, index) => <Fragment key={index}>{card}{adAfter(index)}</Fragment>)}</div>;
}
