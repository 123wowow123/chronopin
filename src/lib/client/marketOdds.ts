'use client';

// Live prediction-market odds for every pin on screen that cites a market,
// over the page's one live stream (src/lib/client/liveFeed.ts). Cards join as
// they near the viewport and leave as they scroll away; the server is told the
// new set (PUT /api/live/:id/odds), batched so a scroll that moves many cards
// is one request. A hidden tab follows none.

import { useCallback, useSyncExternalStore } from 'react';
import type { MarketOdds } from '@/lib/predictionMarkets';
import { onLive, onLiveConnect } from './liveFeed';

// Wide enough to gather the cards one scroll brings in or takes away.
const SYNC_DELAY_MS = 400;

// How many cards and pages want each pin.
const wanted = new Map<number, number>();
// The latest push per pin, kept as cards come and go so nothing blinks out.
const odds = new Map<number, MarketOdds[]>();
const listeners = new Map<number, Set<() => void>>();

let stopFeed: (() => void) | null = null;
let connectionId: string | null = null;
// The set this connection was last told, and whether a request is out.
let told: string | null = null;
let sending = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function sync() {
  const ids = document.hidden ? [] : [...wanted.keys()].sort((a, b) => a - b);
  const key = ids.join(',');
  if (!connectionId || sending || key === told) return;
  const id = connectionId;
  sending = true;
  told = key;
  fetch(`/api/live/${id}/odds`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pins: ids }) })
    .then((res) => {
      // Gone: the stream reconnected and the new one will be told on hello.
      if (!res.ok && connectionId === id) told = null;
    })
    .catch(() => {
      if (connectionId === id) told = null;
    })
    .finally(() => {
      sending = false;
      // One at a time, so the server never applies an older set last.
      settle();
    });
}

// Tells the server what is wanted, then lets go of the stream once nothing is
// and the server follows nothing for this page (told so, or never connected).
function settle() {
  sync();
  if (!wanted.size && !sending && (!connectionId || told === '')) stopFeed?.();
}

function syncSoon() {
  clearTimeout(timer);
  timer = setTimeout(settle, SYNC_DELAY_MS);
}

function startFollowing() {
  if (stopFeed) return;
  const stopOdds = onLive<{ pinId: number; markets: MarketOdds[] }>('odds', ({ pinId, markets }) => {
    odds.set(pinId, markets);
    listeners.get(pinId)?.forEach((listener) => listener());
  });
  const stopConnect = onLiveConnect((id) => {
    connectionId = id;
    told = null;
    sync();
  });
  document.addEventListener('visibilitychange', syncSoon);
  stopFeed = () => {
    stopOdds();
    stopConnect();
    document.removeEventListener('visibilitychange', syncSoon);
    stopFeed = null;
    connectionId = null;
    told = null;
  };
}

// Asks for a pin's odds until the returned function is called.
export function watchMarketOdds(pinId: number): () => void {
  // Wanted first: joining a stream that is already open tells the server at once.
  wanted.set(pinId, (wanted.get(pinId) ?? 0) + 1);
  startFollowing();
  syncSoon();
  let watching = true;
  return () => {
    if (!watching) return;
    watching = false;
    const left = (wanted.get(pinId) ?? 1) - 1;
    if (left) wanted.set(pinId, left);
    else wanted.delete(pinId);
    syncSoon();
  };
}

// A pin's markets as last pushed: null before the first push.
export function useMarketOdds(pinId: number): MarketOdds[] | null {
  const subscribe = useCallback(
    (listener: () => void) => {
      let set = listeners.get(pinId);
      if (!set) listeners.set(pinId, (set = new Set()));
      set.add(listener);
      return () => {
        set.delete(listener);
        if (!set.size) listeners.delete(pinId);
      };
    },
    [pinId],
  );
  return useSyncExternalStore(
    subscribe,
    () => odds.get(pinId) ?? null,
    () => null,
  );
}
