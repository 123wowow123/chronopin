'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useT } from '@/lib/client/i18n';

// A list showing its first `visible` items, with a toggle below for the rest.
// Following a link to an item's id (#ref-7) unfolds the list if need be, then
// scrolls to the item and marks it with data-cited for a moment. (:target
// misses an item that was folded away when the link was followed.)
export function ExpandableList({
  items,
  itemIds,
  visible,
  noun,
  className,
}: {
  items: ReactNode[];
  itemIds?: string[];
  visible: number;
  noun: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();

  useEffect(() => {
    const show = (id: string) => {
      const index = itemIds?.indexOf(id) ?? -1;
      if (index < 0) return;
      if (index >= visible) setOpen(true);
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ block: 'center' });
        el.removeAttribute('data-cited');
        void el.offsetWidth; // restart the highlight when the same item is followed again
        el.setAttribute('data-cited', '');
        setTimeout(() => el.removeAttribute('data-cited'), 2000);
      });
    };
    const reveal = () => show(decodeURIComponent(window.location.hash.slice(1)));
    // A second click on the same [n] leaves the hash unchanged, so no hashchange fires: follow the click itself.
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href*="#ref-"]');
      const hash = link?.getAttribute('href')?.split('#')[1];
      if (hash && link && new URL((link as HTMLAnchorElement).href, window.location.href).hash === window.location.hash) show(decodeURIComponent(hash));
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', reveal);
      document.removeEventListener('click', onClick);
    };
  }, [itemIds, visible]);

  return (
    <>
      <ul className={className}>{open ? items : items.slice(0, visible)}</ul>
      {items.length > visible ? (
        <button type="button" aria-expanded={open} className="py-2 text-sm font-medium text-link hover:underline" onClick={() => setOpen(!open)}>
          {open ? t('common.showFewer') : t('common.showAllN', { count: items.length, noun })}
        </button>
      ) : null}
    </>
  );
}
