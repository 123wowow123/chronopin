import { Suspense, type ReactNode } from 'react';
import styles from '@/components/restaurants/RestaurantGuide.module.css';

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  // Keep this boundary mounted across city routes. During a navigation
  // transition React retains the current guide until the next one is ready.
  return <Suspense fallback={<main className="mx-auto min-h-[75vh] max-w-7xl px-6 py-16" aria-busy="true"><p role="status"><span className={styles.citySpinner} aria-hidden="true" /> Loading the restaurant guide…</p></main>}>{children}</Suspense>;
}
