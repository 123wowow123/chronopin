'use client';

import { useEffect, type RefObject } from 'react';

// Timeline cards seen, counted toward each pin's impressions (the day's pick
// weighs them, src/lib/bagSample.ts). A card counts once at least half of it
// (or, for one taller than the window, half the window's height) has been on
// screen for a second, and once per page; the server keeps one a
// viewer a day. Seen ids go in batches, and whatever is left when the page is
// hidden goes as a beacon, which outlives the page.

const DWELL_MS = 1000;
const BATCH_MS = 5000;
const ENDPOINT = '/api/pins/impressions';

const counted = new Set<number>();
let queue: number[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let observer: IntersectionObserver | null = null;
const cardPin = new WeakMap<Element, number>();
const dwell = new WeakMap<Element, ReturnType<typeof setTimeout>>();

function flush() {
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = null;
  if (!queue.length) return;
  const body = JSON.stringify({ ids: queue });
  queue = [];
  if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
  fetch(ENDPOINT, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', keepalive: true }).catch(() => {});
}

function seen(el: Element) {
  const pinId = cardPin.get(el);
  observer?.unobserve(el);
  if (pinId === undefined || counted.has(pinId)) return;
  counted.add(pinId);
  queue.push(pinId);
  batchTimer ??= setTimeout(flush, BATCH_MS);
}

function cardObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const timer = dwell.get(entry.target);
          const enough = Math.min(entry.boundingClientRect.height, window.innerHeight) / 2;
          if (entry.isIntersecting && entry.intersectionRect.height >= enough) {
            if (!timer) dwell.set(entry.target, setTimeout(() => seen(entry.target), DWELL_MS));
          } else if (timer) {
            clearTimeout(timer);
            dwell.delete(entry.target);
          }
        }
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] },
    );
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', flush);
  }
  return observer;
}

// Counts the card in `ref` as an impression of pinId once it has been seen.
export function useImpression(ref: RefObject<Element | null>, pinId: number, enabled = true) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || counted.has(pinId)) return;
    cardPin.set(el, pinId);
    const io = cardObserver();
    io.observe(el);
    return () => {
      io.unobserve(el);
      const timer = dwell.get(el);
      if (timer) clearTimeout(timer);
      dwell.delete(el);
    };
  }, [ref, pinId, enabled]);
}
