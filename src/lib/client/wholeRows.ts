'use client';

import { useLayoutEffect, useRef } from 'react';

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
export function useWholeRowPanels<T extends HTMLElement>(rowsKey: unknown) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const column = ref.current;
    if (!column) return;
    const panels = () => [...column.children].filter((el): el is HTMLElement => el instanceof HTMLElement && !!el.querySelector('ol'));
    const fit = () => {
      const all = panels();
      for (const panel of all) panel.style.maxHeight = '';
      for (const panel of all) {
        const list = panel.querySelector('ol')!;
        const rows = [...list.children] as HTMLElement[];
        if (!rows.length) continue;
        // Rows still in the first column; the ones that wrapped sit to its right.
        const shown = rows.filter((row) => row.offsetLeft === rows[0].offsetLeft);
        const last = shown[shown.length - 1];
        const listStyle = getComputedStyle(list);
        const panelStyle = getComputedStyle(panel);
        const bottom = last.getBoundingClientRect().bottom + parseFloat(listStyle.paddingBottom) + parseFloat(panelStyle.borderBottomWidth);
        panel.style.maxHeight = `${Math.ceil(bottom - panel.getBoundingClientRect().top)}px`;
      }
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
