import { Suspense, type ReactNode } from 'react';
import { connection } from 'next/server';
import { RestaurantCardAdsProvider } from '@/components/restaurants/RestaurantAdCard';
import styles from '@/components/restaurants/RestaurantGuide.module.css';
import { adPlacements } from '@/server/services/pages';

// The 'card-grid' ad placement for every curated guide under /restaurants
// (city guides, China, Taiwan, Hainan, the nearest-guide page). Read per
// request: the admin setting lives in the database, which a build has none of.
async function CardAds({ children }: { children: ReactNode }) {
  await connection();
  const placements = await adPlacements();
  return <RestaurantCardAdsProvider value={placements['card-grid']}>{children}</RestaurantCardAdsProvider>;
}

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  // Keep this boundary mounted across city routes. During a navigation
  // transition React retains the current guide until the next one is ready.
  return <Suspense fallback={<main className="mx-auto min-h-[75vh] max-w-7xl px-6 py-16" aria-busy="true"><p role="status"><span className={styles.citySpinner} aria-hidden="true" /> Loading the restaurant guide…</p></main>}><CardAds>{children}</CardAds></Suspense>;
}
