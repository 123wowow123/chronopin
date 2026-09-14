'use client';

// The signed-in user, for client components. Fetched once per page load and
// shared; pages stay cacheable because the server HTML never depends on it.

import { useSyncExternalStore } from 'react';
import type { SessionUser } from '@/lib/types';

type State = { status: 'loading' | 'ready'; user: SessionUser | null };

let state: State = { status: 'loading', user: null };
let request: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function load() {
  if (!request) {
    request = fetch('/api/users/me', { credentials: 'same-origin', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((user) => set({ status: 'ready', user }));
  }
  return request;
}

// Forget the cached user, e.g. after signing in, out, or editing the profile.
export function refreshSession() {
  request = null;
  return load();
}

const serverState: State = { status: 'loading', user: null };

export function useSession(): State & { isAdmin: boolean; isLoggedIn: boolean } {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void load();
      return () => listeners.delete(listener);
    },
    () => state,
    () => serverState,
  );
  return { ...current, isLoggedIn: !!current.user, isAdmin: current.user?.role === 'admin' };
}
