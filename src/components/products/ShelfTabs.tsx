'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Anchor from '@/components/ui/Anchor';
import { usePathname } from '@/lib/client/navigation';
import { useT } from '@/lib/client/i18n';
import { queryTabHref, selectQueryTab, useQueryParam } from '@/lib/client/queryTabs';
import styles from '@/components/restaurants/RestaurantGuide.module.css';

// The shelf tabs, as the restaurant guide's view tabs: the URL's query picks the
// shelf (?shelf=audio), the first one without it. Every panel is in the server HTML,
// the others only hidden, so a crawler reads them all.
export function ShelfTabs({ tabs, panels }: { tabs: { id: string; label: string; count: number }[]; panels: ReactNode[] }) {
  const t = useT();
  const pathname = usePathname();
  const shelf = useQueryParam('shelf');
  const selected = tabs.some((tab) => tab.id === shelf) ? shelf : tabs[0]?.id;
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onWheel = (event: WheelEvent) => {
      if (nav.scrollWidth <= nav.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      event.preventDefault();
      nav.scrollLeft += event.deltaY;
    };
    nav.addEventListener('wheel', onWheel, { passive: false });
    return () => nav.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const revealSelected = () => {
      const nav = navRef.current;
      const picked = nav?.querySelector<HTMLElement>('[aria-current="location"]');
      if (nav && picked) {
        const left = picked.offsetLeft;
        const right = left + picked.offsetWidth;
        if (left < nav.scrollLeft || right > nav.scrollLeft + nav.clientWidth) {
          nav.scrollTo({
            left: Math.max(0, left - (nav.clientWidth - picked.offsetWidth) / 2),
            behavior: 'smooth',
          });
        }
      }
    };
    revealSelected();
    window.addEventListener('resize', revealSelected);
    return () => window.removeEventListener('resize', revealSelected);
  }, [selected]);

  return (
    <section id="products" className={styles.openings} aria-label={t('guides.products.browse')}>
      <div className={styles.browseHeading}>
        <div>
          <p className={styles.eyebrow}>{t('guides.products.shelvesEyebrow')}</p>
          <h2>{t('guides.products.shelvesHeading')}</h2>
        </div>
      </div>
      <div className={`${styles.filters} min-w-0 max-w-full overflow-hidden`}>
        <nav ref={navRef} className={`${styles.statusFilters} flex min-w-0 max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto py-1 border-b-0 [overscroll-behavior-x:contain] [scrollbar-width:thin]`} aria-label={t('guides.products.shelfNav')}>
          {tabs.map((tab) => (
            <Anchor key={tab.id} href={queryTabHref(pathname, 'shelf', tab.id)} aria-current={tab.id === selected ? 'location' : undefined} onClick={selectQueryTab('shelf', tab.id)} className="shrink-0 whitespace-nowrap">
              {tab.label} <span aria-hidden="true">·</span> <span>{tab.count.toString().padStart(2, '0')}</span>
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
