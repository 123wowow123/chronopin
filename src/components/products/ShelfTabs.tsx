'use client';

import type { ReactNode } from 'react';
import Anchor from '@/components/ui/Anchor';
import { usePathname } from '@/lib/client/navigation';
import { queryTabHref, selectQueryTab, useQueryParam } from '@/lib/client/queryTabs';
import styles from '@/components/restaurants/RestaurantGuide.module.css';

// The shelf tabs, as the restaurant guide's view tabs: the URL's query picks the
// shelf (?shelf=audio), the first one without it. Every panel is in the server HTML,
// the others only hidden, so a crawler reads them all.
export function ShelfTabs({ tabs, panels }: { tabs: { id: string; label: string; count: number }[]; panels: ReactNode[] }) {
  const pathname = usePathname();
  const shelf = useQueryParam('shelf');
  const selected = tabs.some((tab) => tab.id === shelf) ? shelf : tabs[0]?.id;
  return (
    <section id="products" className={styles.openings} aria-label="Browse products">
      <div className={styles.browseHeading}>
        <div>
          <p className={styles.eyebrow}>THE SHELVES</p>
          <h2>Something good on every shelf.</h2>
        </div>
      </div>
      <div className={styles.filters}>
        <nav className={styles.statusFilters} aria-label="Product shelf">
          {tabs.map((tab) => (
            <Anchor key={tab.id} href={queryTabHref(pathname, 'shelf', tab.id)} aria-current={tab.id === selected ? 'location' : undefined} onClick={selectQueryTab('shelf', tab.id)}>
              {tab.label} <span>{tab.count.toString().padStart(2, '0')}</span>
            </Anchor>
          ))}
        </nav>
      </div>
      {panels.map((panel, i) => (
        <div key={tabs[i].id} hidden={tabs[i].id !== selected}>
          {panel}
        </div>
      ))}
    </section>
  );
}
