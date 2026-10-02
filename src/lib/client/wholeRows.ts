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
// Then the panels in view are evened out to the same number of rows, the
// ones higher up taking any extra.
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
      // The panels in view show the same number of rows when the lists allow
      // it; when the rows do not divide evenly, the panels higher up take the
      // extra. Rows moved only from one panel to another, so the room holds
      // unless the rows differ in height: then the fullest panel gives one up.
      const first = all[0];
      const inView = all.map((panel, i) => i).filter((i) => counts[i] > 0 && all[i].offsetLeft === first.offsetLeft);
      if (inView.length < 2) return;
      const totals = inView.map((i) => panelRows(all[i]).length);
      const spare = inView.reduce((sum, i) => sum + counts[i], 0);
      const target = inView.map(() => 0);
      // One row at a time, to the top panel with the fewest that still has more.
      for (let given = 0; given < spare; ) {
        let moved = false;
        for (let k = 0; k < inView.length && given < spare; k++) {
          if (target[k] < totals[k] && target[k] === Math.min(...target.filter((n, j) => n < totals[j]))) {
            target[k]++;
            given++;
            moved = true;
          }
        }
        if (!moved) break;
      }
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
      let h = heights();
      while (h.reduce((a, b) => a + b, 0) + gap * (inView.length - 1) > room + 1) {
        let fullest = -1;
        for (let k = 0; k < inView.length; k++) if (target[k] > 1 && (fullest < 0 || target[k] >= target[fullest])) fullest = k;
        if (fullest < 0) break;
        target[fullest]--;
        h = heights();
      }
      inView.forEach((i, k) => {
        all[i].style.maxHeight = `${h[k]}px`;
      });
    };
    fit();
    // The column is sized by the controls above it, not by its panels:
    // capping them never resizes what is observed.
    const observer = new ResizeObserver(fit);
    observer.observe(column);
    return () => {
      observer.disconnect();
      for (const panel of panels()) panel.style.maxHeight = '';
    };
  }, [rowsKey]);
  return ref;
}
