'use client';

import { useSyncExternalStore } from 'react';

// The current time, ticking every intervalMs. Rendering reads a stored value
// rather than calling Date.now(), so server rendering and hydration agree:
// on the server (and during hydration) it is serverNow.
const clocks = new Map<number, { now: number; listeners: Set<() => void>; timer?: ReturnType<typeof setInterval> }>();

function clock(intervalMs: number) {
  let c = clocks.get(intervalMs);
  if (!c) {
    c = { now: Date.now(), listeners: new Set() };
    clocks.set(intervalMs, c);
  }
  return c;
}

export function useNow(intervalMs: number, serverNow = 0): number {
  return useSyncExternalStore(
    (listener) => {
      const c = clock(intervalMs);
      c.listeners.add(listener);
      if (!c.timer) {
        c.now = Date.now();
        c.timer = setInterval(() => {
          c.now = Date.now();
          c.listeners.forEach((l) => l());
        }, intervalMs);
        // Pick up the fresh time straight away rather than a tick later.
        queueMicrotask(() => c.listeners.forEach((l) => l()));
      }
      return () => {
        c.listeners.delete(listener);
        if (!c.listeners.size && c.timer) {
          clearInterval(c.timer);
          c.timer = undefined;
        }
      };
    },
    () => clock(intervalMs).now,
    () => serverNow,
  );
}
