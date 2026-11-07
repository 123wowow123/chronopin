'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { ReviewSummary } from '@/lib/userReviews';

const EMPTY: ReviewSummary = { average: null, count: 0 };

// One batched request for every visible restaurant, shared by all its dishes.
const known = new Map<number, Record<string, ReviewSummary>>();
const listeners = new Map<number, Set<() => void>>();
const pending = new Set<number>();
const loading = new Set<number>();
let scheduled = false;

async function flush() {
  scheduled = false;
  const ids = [...pending].slice(0, 200);
  ids.forEach((id) => { pending.delete(id); loading.add(id); });
  try {
    const response = await fetch(`/api/pins/review-summaries?items=1&ids=${ids.join(',')}`, { cache: 'no-store' });
    if (response.ok) {
      const answer: Record<number, Record<string, ReviewSummary>> = await response.json();
      for (const id of ids) {
        // Preserve any fresher summary received from an open review form.
        known.set(id, { ...answer[id], ...known.get(id) });
        listeners.get(id)?.forEach((notify) => notify());
      }
    }
  } catch {
    // Unknown is distinct from a confirmed zero; the icon can still open reviews.
  } finally {
    ids.forEach((id) => loading.delete(id));
    if (pending.size) schedule();
  }
}
function schedule() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(flush, 0);
}

export function setMenuItemReviewSummary(pinId: number, item: string, summary: ReviewSummary) {
  known.set(pinId, { ...known.get(pinId), [item]: summary });
  listeners.get(pinId)?.forEach((notify) => notify());
}

export function useMenuItemReviewSummary(pinId: number | null | undefined, item: string) {
  const subscribe = useCallback((notify: () => void) => {
    if (!pinId) return () => {};
    const set = listeners.get(pinId) ?? new Set();
    set.add(notify);
    listeners.set(pinId, set);
    if (!known.has(pinId) && !loading.has(pinId)) { pending.add(pinId); schedule(); }
    return () => { set.delete(notify); };
  }, [pinId]);
  const snapshot = useCallback(() => {
    if (!pinId) return EMPTY;
    const summaries = known.get(pinId);
    return summaries ? Object.hasOwn(summaries, item) ? summaries[item] : EMPTY : undefined;
  }, [pinId, item]);
  return useSyncExternalStore(subscribe, snapshot, () => undefined);
}
