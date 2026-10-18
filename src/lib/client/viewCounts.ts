'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { onLive } from './liveFeed';

// One displayed lifetime total per pin, even when cached cards and Trending
// arrive at different times. Counts only rise; older snapshots cannot undo a view.
const counts = new Map<number, number>();
const listeners = new Set<() => void>();

export function updateViewCount(pinId: number, count: number) {
  if (!Number.isFinite(count) || count < 0 || count <= (counts.get(pinId) ?? -1)) return;
  counts.set(pinId, count);
  listeners.forEach((listener) => listener());
}

export function useViewCount(pinId: number, initial = 0) {
  const count = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    () => Math.max(initial, counts.get(pinId) ?? 0),
    () => initial,
  );
  useEffect(() => {
    updateViewCount(pinId, initial);
    return onLive<{ id?: number; viewCount?: number }>('pin:view', (changed) => {
      if (changed.id === pinId && typeof changed.viewCount === 'number') updateViewCount(pinId, changed.viewCount);
    });
  }, [pinId, initial]);
  return count;
}
