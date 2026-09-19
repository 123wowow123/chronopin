'use client';

import { useEffect, useRef } from 'react';

// A count that just changed (a view or watch arriving live, or the viewer's
// own watch) says so: the new number slides in from the side it moved toward
// - up from below as it grows, down from above as it shrinks - and flashes
// the link colour. Not on first render, and not for readers who asked for
// less motion. Returns the ref for the number's element (inline-block, so it
// can move).
export function useCountBump<T extends HTMLElement>(value: number) {
  const ref = useRef<T>(null);
  const last = useRef(value);

  useEffect(() => {
    const previous = last.current;
    last.current = value;
    const el = ref.current;
    if (previous === value || !el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const from = value > previous ? '0.6em' : '-0.6em';
    el.animate([{ transform: `translateY(${from})`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 250, easing: 'ease-out' });
    const flash = getComputedStyle(document.documentElement).getPropertyValue('--color-link').trim();
    if (flash) el.animate([{ color: flash }, { color: getComputedStyle(el).color }], { duration: 1200, easing: 'ease-in' });
  }, [value]);

  return ref;
}
