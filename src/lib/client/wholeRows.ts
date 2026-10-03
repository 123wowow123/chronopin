'use client';

import { useLayoutEffect, useRef } from 'react';

const panelRows = (panel: HTMLElement) => [...panel.querySelector('ol')!.children] as HTMLElement[];

// Side panels stacked in a column (trending over new pins) whose lists show
// only whole rows - the rest wrap into a clipped second column - would
// otherwise keep the height they were given, leaving blank space under their
// last rows. This caps each panel at its last whole row, measured again
// whenever the column's room or the rows change.
//
// Panels are fitted in order from the one column: each is measured with the
// ones after it uncapped, so it takes its fair share of the room (the panels
// split it as their flex growth says) and the next one is left the rest,
// without the panels resizing each other back and forth.
//
// Then the room is shared out evenly from the top down, a row at a time to
// the panel showing the fewest. A panel marked data-rows-last (sponsored)
// keeps one row and is given only what the others leave, never more rows than
// the least of them.
export function useWholeRowPanels<T extends HTMLElement>(rowsKey: unknown) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const column = ref.current;
    if (!column) return;
    const panels = () => [...column.children].filter((el): el is HTMLElement => el instanceof HTMLElement && !!el.querySelector('ol'));
    const fit = () => {
      const all = panels();
      for (const panel of all) panel.style.maxHeight = '';
      // How many whole rows each panel shows at its fair share of the room.
      const counts = all.map((panel) => {
        const list = panel.querySelector('ol')!;
        const rows = [...list.children] as HTMLElement[];
        if (!rows.length) return 0;
        // Rows still in the first column; the ones that wrapped sit to its right.
        const shown = rows.filter((row) => row.offsetLeft === rows[0].offsetLeft).length;
        const last = rows[shown - 1];
        const listStyle = getComputedStyle(list);
        const panelStyle = getComputedStyle(panel);
        const bottom = last.getBoundingClientRect().bottom + parseFloat(listStyle.paddingBottom) + parseFloat(panelStyle.borderBottomWidth);
        panel.style.maxHeight = `${Math.ceil(bottom - panel.getBoundingClientRect().top)}px`;
        return shown;
      });
      const first = all[0];
      const inView = all.map((panel, i) => i).filter((i) => counts[i] > 0 && all[i].offsetLeft === first.offsetLeft);
      if (inView.length < 2) return;
      const totals = inView.map((i) => panelRows(all[i]).length);
      const room = column.clientHeight;
      const gap = parseFloat(getComputedStyle(column).rowGap) || 0;
      const heightFor = (i: number, n: number) => {
        const panel = all[i];
        const list = panel.querySelector('ol')!;
        const rows = panelRows(panel);
        const listStyle = getComputedStyle(list);
        const panelStyle = getComputedStyle(panel);
        const rowsHeight = rows.slice(0, n).reduce((sum, row) => sum + row.getBoundingClientRect().height, 0);
        const head = list.getBoundingClientRect().top - panel.getBoundingClientRect().top;
        return Math.ceil(head + parseFloat(listStyle.paddingTop) + rowsHeight + parseFloat(listStyle.paddingBottom) + parseFloat(panelStyle.borderBottomWidth));
      };
      const heights = () => inView.map((i, k) => heightFor(i, target[k]));
      // Every panel in view keeps its first row; the rest of the room goes out
      // a row at a time, each only if the column still holds it, to whichever
      // panel shows the fewest, the ones higher up taking ties - so the panels
      // fill evenly from the top down. A panel marked data-rows-last
      // (sponsored) stays at one row until the others show FIRST_FILL each,
      // and never shows more rows than the least of them.
      const FIRST_FILL = 4;
      const target = inView.map(() => 1);
      const fits = () => heights().reduce((a, b) => a + b, 0) + gap * (inView.length - 1) <= room + 1;
      const last = inView.map((i) => 'rowsLast' in all[i].dataset);
      const main = inView.map((_, k) => k).filter((k) => !last[k]);
      const lowest = () => Math.min(...main.map((k) => target[k]));
      const room_for = (k: number, cap: number) => target[k] < Math.min(totals[k], cap) && (!last[k] || (lowest() >= FIRST_FILL && target[k] < lowest()));
      const fill = (cap: number) => {
        for (;;) {
          let next = -1;
          for (let k = 0; k < inView.length; k++) if (room_for(k, cap) && (next < 0 || target[k] < target[next])) next = k;
          if (next < 0) return true;
          target[next]++;
          if (!fits()) {
            target[next]--;
            return false;
          }
        }
      };
      if (fill(FIRST_FILL)) fill(Infinity);
      const h = heights();
      inView.forEach((i, k) => {
        all[i].style.maxHeight = `${h[k]}px`;
      });
    };
    fit();
    // The column is sized by the controls above it, not by its panels:
    // capping them never resizes what is observed.
    const observer = new ResizeObserver(fit);
    observer.observe(column);
    // A row that changes height once measured (a late picture, a font) leaves
    // its panel capped for the old height: fit again. Capping a panel never
    // resizes a row.
    for (const panel of panels()) for (const row of panelRows(panel)) observer.observe(row);
    return () => {
      observer.disconnect();
      for (const panel of panels()) panel.style.maxHeight = '';
    };
  }, [rowsKey]);
  return ref;
}
