// The signed-in reader's own tickers on the trades pages, saved to the account
// (/api/own-tickers), which is what the alerts read. Signed out there are none.

import { useEffect, useSyncExternalStore } from 'react';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { parseTickerInput } from '@/lib/ownTickers';

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

// What a signed-out reader typed before Add sent them to log in, kept so that
// coming back adds it (as pendingAction does for a click). Logging in loads the
// page anew, so it waits in sessionStorage.
const PENDING = 'pendingTickers';
const PENDING_MAX_AGE_MS = 15 * 60_000;

export function savePendingTickers(symbols: string[]) {
  try {
    if (symbols.length) sessionStorage.setItem(PENDING, JSON.stringify({ symbols, savedAt: Date.now() }));
    else sessionStorage.removeItem(PENDING);
  } catch {
    // Without storage the reader types it again.
  }
}

// Taken as it is read, so it is added once.
export function takePendingTickers(): string[] {
  try {
    const raw = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    const pending = raw ? (JSON.parse(raw) as { symbols: string[]; savedAt: number }) : null;
    return pending && Date.now() - pending.savedAt < PENDING_MAX_AGE_MS ? parseTickerInput(pending.symbols.join(' ')).symbols : [];
  } catch {
    return [];
  }
}

