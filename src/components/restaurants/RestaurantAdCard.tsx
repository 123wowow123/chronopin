'use client';

import { createContext, useContext } from 'react';
import { AdLink, AdPicture, Disclosure, useAdText } from '@/components/ads/AdBlock';
import { useT } from '@/lib/client/i18n';
import type { AdJson } from '@/lib/ads';
import styles from './RestaurantGuide.module.css';

// Whether the 'card-grid' ad placement (admin setting) is on; the region page
// provides it, so a guide opened elsewhere shows no ad cards.
const CardAdsContext = createContext(false);
export const RestaurantCardAdsProvider = CardAdsContext.Provider;
export const useRestaurantCardAds = () => useContext(CardAdsContext);

// The guide's colours, which a card outside the guide does not inherit.
const PREVIEW_VARS = { '--paper-raised': '#fffdf7', '--text': '#263c32', '--soft': '#627069', '--rule': '#d8dcd0', '--green': '#244d39', color: '#263c32' } as React.CSSProperties;

// The card's link; in a preview nothing is a link and nothing is counted.
function Wrap({ ad, preview, children }: { ad: AdJson; preview: boolean; children: React.ReactNode }) {
  const className = 'flex h-full flex-col text-inherit hover:no-underline';
  if (preview) return <div className={className}>{children}</div>;
  return <AdLink ad={ad} slot="card-grid" className={className}>{children}</AdLink>;
}

// An ad drawn as one of the guide's cards: picture on top, "Sponsored" where
// the status badge sits, the ad's own words, and its link's words in the foot.
export function RestaurantAdCard({ ad, preview = false }: { ad: AdJson; preview?: boolean }) {
  const t = useT();
  const text = useAdText();
  const { title, body, info, cta } = text(ad);
  const description = body || info;
  return (
    <article className={styles.card} style={preview ? PREVIEW_VARS : undefined} data-ad-key={ad.key}>
      <Wrap ad={ad} preview={preview}>
        <span className={styles.photoLink}>
          <AdPicture ad={ad} className="absolute inset-0 !rounded-none !border-0" />
          <span className={styles.cardBadge}>{t('ads.sponsored').toUpperCase()}</span>
        </span>
        <span className={styles.cardBody}>
          {ad.brand ? <p className={styles.cardMeta}>{ad.brand}</p> : null}
          <h3>{title}</h3>
          {description ? <p className={styles.cardDescription}>{description}</p> : null}
          {ad.kind === 'sponsored' ? null : <Disclosure ads={[ad]} className="mb-3" />}
          <div className={styles.cardFoot}>
            <div>
              <span>{t('ads.sponsored').toUpperCase()}</span>
              <strong>{cta}</strong>
            </div>
            <span className={styles.cardArrow} aria-hidden="true">↗</span>
          </div>
        </span>
      </Wrap>
    </article>
  );
}
