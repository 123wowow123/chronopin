'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

// Columns are a fixed width so a card is the same size wherever the grid
// appears; phones get one full column.
const GRID = 'relative grid grid-cols-[repeat(auto-fill,22rem)] items-start gap-2.5 max-sm:grid-cols-1 *:relative';

// A ranked grid of pin cards packed like masonry. The CSS grid still places the
// cards row by row (so reading and tab order follow the ranking), then each card
// is lifted into the space left under the card above it. `top` rather than a
// transform: a transformed ancestor would trap any position:fixed in the card.
export function CardGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  const listRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    const pack = () => {
      const items = [...list.children] as HTMLElement[];
      const columns = getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      // offsetTop includes a relative offset, so measure with the lifts cleared.
      for (const item of items) {
        item.style.top = '';
      }
      const boxes = items.map((item) => ({ top: item.offsetTop, height: item.offsetHeight }));
      const bottoms: number[] = [];
      let lowest = 0;
      boxes.forEach(({ top, height }, i) => {
        const column = i % columns;
        const lift = column in bottoms ? Math.max(0, top - (bottoms[column] + gap)) : 0;
        items[i].style.top = lift ? `${-lift}px` : '';
        bottoms[column] = top - lift + height;
        lowest = Math.max(lowest, bottoms[column]);
      });
      // Offsets don't shrink the grid, so hand the space the lifts freed back.
      list.style.marginBottom = items.length ? `${Math.min(0, lowest - list.offsetHeight)}px` : '';
    };

    // Resizes cover everything that moves a card: the list's width changing the
    // column count, and a card growing (media loading, "show more").
    const resizes = new ResizeObserver(pack);
    resizes.observe(list);
    const observeItems = () => {
      for (const item of list.children) {
        resizes.observe(item);
      }
    };
    observeItems();
    const additions = new MutationObserver(() => {
      observeItems();
      pack();
    });
    additions.observe(list, { childList: true });
    return () => {
      resizes.disconnect();
      additions.disconnect();
    };
  }, []);

  return (
    <ul ref={listRef} className={`${GRID} ${className}`}>
      {children}
    </ul>
  );
}
