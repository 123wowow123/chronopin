'use client';

// Live quotes for the tickers of the pins a page shows, over the page's one
// live stream (src/lib/client/liveFeed.ts): the server is told which pins
// (PUT /api/live/:id/stocks) and pushes each of their tickers' quotes as it
// re-reads them. A hidden tab follows none. Shaped like marketOdds.ts.

import { useCallback, useSyncExternalStore } from 'react';
import type { StockQuote } from '@/lib/stocks';
import { onLive, onLiveConnect } from './liveFeed';

const SYNC_DELAY_MS = 400;

const wanted = new Map<number, number>();
const quotes = new Map<string, StockQuote>();
const listeners = new Map<string, Set<() => void>>();

let stopFeed: (() => void) | null = null;
let connectionId: string | null = null;
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
  fetch(`/api/live/${id}/stocks`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pins: ids }) })
    .then((res) => {
      if (!res.ok && connectionId === id) told = null;
    })
    .catch(() => {
      if (connectionId === id) told = null;
    })
    .finally(() => {
      sending = false;
      settle();
    });
}

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
  const stopQuotes = onLive<StockQuote>('stock', (quote) => {
    quotes.set(quote.symbol, quote);
    listeners.get(quote.symbol)?.forEach((listener) => listener());
  });
  const stopConnect = onLiveConnect((id) => {
    connectionId = id;
    told = null;
    sync();
  });
  document.addEventListener('visibilitychange', syncSoon);
  stopFeed = () => {
    stopQuotes();
    stopConnect();
    document.removeEventListener('visibilitychange', syncSoon);
    stopFeed = null;
    connectionId = null;
    told = null;
  };
}

// Asks for a pin's ticker quotes until the returned function is called.
export function watchStockQuotes(pinId: number): () => void {
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

// After a ticker is added to or taken off a watched pin: the server reads the
// pins' tickers again.
export function refreshStockQuotes() {
  told = null;
  syncSoon();
}

// A symbol's quote as last pushed: null before the first.
export function useStockQuote(symbol: string): StockQuote | null {
  const subscribe = useCallback(
    (listener: () => void) => {
      let set = listeners.get(symbol);
      if (!set) listeners.set(symbol, (set = new Set()));
      set.add(listener);
      return () => {
        set.delete(listener);
        if (!set.size) listeners.delete(symbol);
      };
    },
    [symbol],
  );
  return useSyncExternalStore(
    subscribe,
    () => quotes.get(symbol) ?? null,
    () => null,
  );
}
