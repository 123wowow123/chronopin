'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import styles from './PinPillRow.module.css';

// Shrink labels from right to left, keeping numbers and other items intact.
export function PinPillRow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const fit = () => {
      const items = Array.from(row.children) as HTMLElement[];
      for (const item of items) item.style.width = '';
      const widths = items.map((item) => item.getBoundingClientRect().width);
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      let excess = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, items.length - 1) - row.clientWidth;
      for (let i = items.length - 1; i >= 0 && excess > 0; i--) {
        const label = items[i].querySelector<HTMLElement>('.pill-label');
        if (!label) continue;
        const reduction = Math.min(excess, label.getBoundingClientRect().width);
        items[i].style.width = `${widths[i] - reduction}px`;
        excess -= reduction;
      }
      // On very narrow cards, only shorten the date after all pill labels
      // have given up their space. Scores remain fully visible.
      if (excess > 0) {
        const dateIndex = items.findIndex((item) => item.matches('time') || item.querySelector('time'));
        if (dateIndex >= 0) items[dateIndex].style.width = `${Math.max(0, widths[dateIndex] - excess)}px`;
      }
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(row);
    const mutation = new MutationObserver(fit);
    mutation.observe(row, { childList: true, characterData: true, subtree: true });
    let active = true;
    void document.fonts.ready.then(() => { if (active) fit(); });
    return () => {
      active = false;
      resize.disconnect();
      mutation.disconnect();
    };
  }, [children]);
  return <div ref={ref} className={styles.row}>{children}</div>;
}
