// The reader's own tickers on the trades pages. Signed in, they are saved to the
// account (/api/own-tickers), which is what the alerts read; signed out, in
// this browser. Those added signed out move to the account on signing in.

import { useEffect, useSyncExternalStore } from 'react';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { MAX_OWN_TICKERS, readOwnTickers } from '@/lib/ownTickers';

const KEY = 'chronopin:own-tickers';
const EMPTY: string[] = [];

// Whose list is shown: a user's id, null for this browser's, undefined until known.
let owner: number | null | undefined;
let state: string[] = EMPTY;
const listeners = new Set<() => void>();

function set(next: string[]) {
  state = next;
  listeners.forEach((listener) => listener());
}

function read(): string[] {
  try {
    return readOwnTickers(localStorage.getItem(KEY));
  } catch {
    return EMPTY;
  }
}

function write(next: string[]) {
  // Blocked or full storage keeps the list for this visit only.
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

async function loadAccount(userId: number) {
  try {
    const local = read();
    const { symbols } = local.length
      ? await api.post<{ symbols: string[] }>('/api/own-tickers', { symbols: local })
      : await api.get<{ symbols: string[] }>('/api/own-tickers');
    // Saved to the account now (the cap may have left some here).
    if (local.length) write(local.filter((s) => !symbols.includes(s)));
    if (owner === userId) set(symbols);
  } catch {
    // Asked again on the next page that shows them.
    if (owner === userId) owner = undefined;
  }
}

function show(userId: number | null) {
  if (owner === userId) return;
  owner = userId;
  if (userId === null) return set(read());
  set(EMPTY);
  void loadAccount(userId);
}

function onStorage(event: StorageEvent) {
  // Another tab's change to this browser's list.
  if (event.key === KEY && owner === null) set(read());
}

function subscribe(listener: () => void) {
  if (!listeners.size) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener('storage', onStorage);
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

// Throws when the account could not save it.
export async function addOwnTickers(symbols: string[]) {
  const userId = owner;
  if (userId == null) {
    const next = [...new Set([...read(), ...symbols])].slice(0, MAX_OWN_TICKERS);
    write(next);
    return set(next);
  }
  const saved = await api.post<{ symbols: string[] }>('/api/own-tickers', { symbols });
  if (owner === userId) set(saved.symbols);
}

export async function removeOwnTicker(symbol: string) {
  const userId = owner;
  const next = state.filter((s) => s !== symbol);
  if (userId == null) {
    write(next);
    return set(next);
  }
  const saved = await api.delete<{ symbols: string[] }>(`/api/own-tickers?symbol=${encodeURIComponent(symbol)}`);
  if (owner === userId) set(saved.symbols);
}
