// The signed-in reader's own tickers on the trades pages, saved to the account
// (/api/own-tickers), which is what the alerts read. Signed out there are none.

import { useEffect, useSyncExternalStore } from 'react';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';

const EMPTY: string[] = [];

// Whose list is shown: a user's id, or null for nobody's (signed out, or not read yet).
let owner: number | null = null;
let state: string[] = EMPTY;
const listeners = new Set<() => void>();

function set(next: string[]) {
  state = next;
  listeners.forEach((listener) => listener());
}

async function load(userId: number) {
  try {
    const { symbols } = await api.get<{ symbols: string[] }>('/api/own-tickers');
    if (owner === userId) set(symbols);
  } catch {
    // Asked again on the next page that shows them.
    if (owner === userId) owner = null;
  }
}

function show(userId: number | null) {
  if (owner === userId) return;
  owner = userId;
  set(EMPTY);
  if (userId !== null) void load(userId);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useOwnTickers(): string[] {
  const { status, user } = useSession();
  const userId = user?.id ?? null;
  useEffect(() => {
    if (status === 'ready') show(userId);
  }, [status, userId]);
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

// Both throw when the account could not save the change.
export async function addOwnTickers(symbols: string[]) {
  const userId = owner;
  const saved = await api.post<{ symbols: string[] }>('/api/own-tickers', { symbols });
  if (owner === userId) set(saved.symbols);
}

export async function removeOwnTicker(symbol: string) {
  const userId = owner;
  const saved = await api.delete<{ symbols: string[] }>(`/api/own-tickers?symbol=${encodeURIComponent(symbol)}`);
  if (owner === userId) set(saved.symbols);
}
