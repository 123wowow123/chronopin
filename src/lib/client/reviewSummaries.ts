'use client';

import { useEffect, useState } from 'react';
import type { ReviewSummary } from '@/lib/userReviews';

// Reader-review averages for the cards on a landing page. Cards ask one by one
// as they mount; the asks of one tick go out as a single request, and answers
// are kept for the page's life so a card scrolled back into view costs nothing.
const known = new Map<number, ReviewSummary>();
const waiting = new Map<number, Set<() => void>>();
let queue: number[] = [];
let scheduled = false;

async function flush() {
  scheduled = false;
  const ids = queue;
  queue = [];
  let answer: Record<number, ReviewSummary> = {};
  try {
    const res = await fetch(`/api/pins/review-summaries?ids=${ids.join(',')}`, { credentials: 'same-origin' });
    if (res.ok) answer = await res.json();
  } catch {
    // The badge simply stays unrated.
  }
  for (const id of ids) {
    known.set(id, answer[id] ?? { average: null, count: 0 });
    waiting.get(id)?.forEach((notify) => notify());
    waiting.delete(id);
  }
}

// The pin's summary, or undefined until it is known.
export function useReviewSummary(pinId: number, enabled: boolean): ReviewSummary | undefined {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!enabled || known.has(pinId)) return;
    const notify = () => bump((n) => n + 1);
    const set = waiting.get(pinId) ?? new Set();
    set.add(notify);
    waiting.set(pinId, set);
    if (!queue.includes(pinId)) queue.push(pinId);
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => setTimeout(flush, 0));
    }
    return () => {
      set.delete(notify);
    };
  }, [pinId, enabled]);
  return enabled ? known.get(pinId) : undefined;
}
