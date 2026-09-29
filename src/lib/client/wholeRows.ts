'use client';

import { useLayoutEffect, useRef } from 'react';

// A side panel whose list shows only whole rows (the rest wrap into a clipped
// second column) would otherwise keep the height it was given, leaving blank
// space under its last row. This caps the panel at that row instead, measured
// again whenever the room it is given or its rows change.
export function useWholeRows<T extends HTMLElement>(rowsKey: unknown) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const panel = ref.current;
    const list = panel?.querySelector('ol');
    if (!panel || !list) return;
    const fit = () => {
      panel.style.maxHeight = '';
      const rows = [...list.children] as HTMLElement[];
      if (!rows.length) return;
      // Rows still in the first column; the ones that wrapped sit to its right.
      const shown = rows.filter((row) => row.offsetLeft === rows[0].offsetLeft);
      const last = shown[shown.length - 1];
      const listStyle = getComputedStyle(list);
      const panelStyle = getComputedStyle(panel);
      const bottom = last.getBoundingClientRect().bottom + parseFloat(listStyle.paddingBottom) + parseFloat(panelStyle.borderBottomWidth);
      panel.style.maxHeight = `${Math.ceil(bottom - panel.getBoundingClientRect().top)}px`;
    };
    fit();
    // The container is sized by the controls above it, not by the panel, and
    // the panel before this one (trending, over new pins) leaves it its room:
    // capping this panel never resizes what is observed.
    const observer = new ResizeObserver(fit);
    for (const el of [panel.parentElement, panel.previousElementSibling]) if (el) observer.observe(el);
    return () => {
      observer.disconnect();
      panel.style.maxHeight = '';
    };
  }, [rowsKey]);
  return ref;
}
