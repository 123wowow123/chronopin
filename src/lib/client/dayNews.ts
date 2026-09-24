'use client';

import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react';

// How many pins a timeline day has gained since this browser last saw it, for
// the "new" badge on its "View all" pill. Each day's total is remembered once
// the day has been on screen; the count to beat is the one remembered when the
// site was opened in this tab, so the badge stays for the whole visit (and
// grows if the live feed adds more) and is gone next time unless more pins
// come. A day never seen before has nothing to compare, so it shows no badge.
// Per browser only: nothing here is worth a server round trip, and storage
// can be blocked.

const KEY = 'chronopin:dayTotals';
// The days remembered, the ones seen longest ago dropped first.
const MAX_DAYS = 500;

function read(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function remember(day: string, total: number) {
  try {
    const totals = read();
    if (totals[day] === total) return;
    // Re-inserted last, so the oldest entries are the first keys.
    delete totals[day];
    totals[day] = total;
    const days = Object.keys(totals);
    for (const old of days.slice(0, Math.max(0, days.length - MAX_DAYS))) delete totals[old];
    localStorage.setItem(KEY, JSON.stringify(totals));
  } catch {}
}

// The totals as they were when the site opened in this tab: what this visit
// compares against, however many days it remembers meanwhile.
let atOpen: Record<string, number> | null = null;
const noSubscribe = () => () => {};

export function useDayNews(ref: RefObject<Element | null>, day: string, total: number, enabled: boolean): number {
  // Null on the server and while hydrating (the server has no storage, and
  // the first client render must match it), then the day's total at open.
  const baseline = useSyncExternalStore(
    noSubscribe,
    () => {
      atOpen ??= read();
      const stored = atOpen[day];
      return typeof stored === 'number' ? stored : null;
    },
    () => null,
  );
  const seen = useRef(false);

  // Remember the total once the day is on screen, and again whenever it
  // changes after that.
  useEffect(() => {
    if (!enabled) return;
    atOpen ??= read();
    if (seen.current) {
      remember(day, total);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      seen.current = true;
      remember(day, total);
      observer.disconnect();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, day, total, enabled]);

  return enabled && baseline != null ? Math.max(0, total - baseline) : 0;
}
