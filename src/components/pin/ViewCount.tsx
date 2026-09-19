'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useCountBump } from '@/lib/client/countBump';
import { onLive } from '@/lib/client/liveFeed';
import { compactCount } from '@/lib/format';

// A visit being counted, per pin, shared while it is in flight: StrictMode
// runs the effect twice, and a first-time visitor's two requests would each
// be given a visitor cookie of their own, counting the visit twice.
const recording = new Map<number, Promise<number | null>>();

function recordView(pinId: number): Promise<number | null> {
  let pending = recording.get(pinId);
  if (!pending) {
    pending = fetch(`/api/pins/${pinId}/view`, { method: 'POST', credentials: 'same-origin', keepalive: true })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { viewCount?: number } | null) => (typeof body?.viewCount === 'number' ? body.viewCount : null))
      .catch(() => null)
      .finally(() => recording.delete(pinId));
    recording.set(pinId, pending);
  }
  return pending;
}

// How many times the pin's page has been viewed (once per viewer a day),
// beside its watch count, following new views live wherever it is shown. Its
// own count: the timeline's copy of the pin keeps the views its day's pick
// was drawn with, so a view never reshuffles the cards being read.
// track: this is the pin's own page, so this visit is counted from here
// (the page HTML is cached and shared, so the count is sent from the
// browser), and the answer brings the count up to date.
export function ViewCount({ pinId, initial, track = false }: { pinId: number; initial?: number; track?: boolean }) {
  const [count, setCount] = useState(initial ?? 0);
  const countRef = useCountBump<HTMLSpanElement>(count);

  useEffect(() => {
    if (!track) return;
    let live = true;
    recordView(pinId).then((viewCount) => {
      if (live && viewCount !== null) setCount(viewCount);
    });
    return () => {
      live = false;
    };
  }, [pinId, track]);

  useEffect(() => {
    return onLive<{ id?: number; viewCount?: number }>('pin:view', (changed) => {
      if (changed.id === pinId && typeof changed.viewCount === 'number') setCount(changed.viewCount);
    });
  }, [pinId]);

  const label = `${count.toLocaleString('en-US')} ${count === 1 ? 'view' : 'views'}`;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 text-sm text-subtle tabular-nums" title={label} aria-label={label}>
      <Icon name="views" className="size-4" />
      <span ref={countRef} aria-hidden className="inline-block">
        {compactCount(count)}
      </span>
    </span>
  );
}
