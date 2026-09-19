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
    const reveal = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const index = itemIds?.indexOf(id) ?? -1;
      if (index < 0) return;
      if (index >= visible) setOpen(true);
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ block: 'center' });
        el.setAttribute('data-cited', '');
        setTimeout(() => el.removeAttribute('data-cited'), 2000);
      });
    };
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, [itemIds, visible]);

  return (
    <>
      <ul className={className}>{open ? items : items.slice(0, visible)}</ul>
      {items.length > visible ? (
        <button type="button" aria-expanded={open} className="py-2 text-sm font-medium text-link" onClick={() => setOpen(!open)}>
          {open ? t('common.showFewer') : t('common.showAllN', { count: items.length, noun })}
        </button>
      ) : null}
    </>
  );
}
