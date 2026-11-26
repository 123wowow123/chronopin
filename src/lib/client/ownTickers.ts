// The reader's own tickers on the trades pages, kept in this browser, so a
// visitor who is not signed in has them too.

import { useSyncExternalStore } from 'react';
import { MAX_OWN_TICKERS, readOwnTickers } from '@/lib/ownTickers';

const KEY = 'chronopin:own-tickers';
const EMPTY: string[] = [];

let state: string[] | null = null;
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    return readOwnTickers(localStorage.getItem(KEY));
  } catch {
    return EMPTY;
  }
}

function set(next: string[]) {
  state = next;
  // Blocked or full storage keeps the list for this visit only.
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((listener) => listener());
}

export function useOwnTickers(): string[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      // Another tab's change.
      const onStorage = (event: StorageEvent) => {
        if (event.key !== KEY) return;
        state = read();
        listener();
      };
      window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
      };
    },
    () => (state ??= read()),
    () => EMPTY,
  );
}

export function addOwnTickers(symbols: string[]) {
  set([...new Set([...(state ?? read()), ...symbols])].slice(0, MAX_OWN_TICKERS));
}

export function removeOwnTicker(symbol: string) {
  set((state ?? read()).filter((s) => s !== symbol));
}
