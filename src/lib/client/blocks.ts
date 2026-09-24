'use client';

// Whom the signed-in reader has blocked (0076), for client components: the
// timeline and search leave those people's pins out, and Profile > Blocked
// lists them. Fetched once per page load, after the session is known, and
// shared. Who blocked the reader is never sent, and their comments are
// already left out by the server.

import { useSyncExternalStore } from 'react';
import { api } from './api';
import { sessionUser } from './session';

export type BlockedUser = { id: number; userName: string; pictureUrl: string | null };

type State = { status: 'loading' | 'ready'; users: BlockedUser[]; ids: ReadonlySet<number> };

const EMPTY: State = { status: 'loading', users: [], ids: new Set() };
let state: State = EMPTY;
let request: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(users: BlockedUser[]) {
  state = { status: 'ready', users, ids: new Set(users.map((u) => u.id)) };
  listeners.forEach((l) => l());
}

function load() {
  if (!request) {
    request = sessionUser()
      .then((user) => (user ? api.get<BlockedUser[]>('/api/users/me/blocks') : []))
      .catch(() => [])
      .then(set);
  }
  return request;
}

export function useBlocks(): State {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void load();
      return () => listeners.delete(listener);
    },
    () => state,
    () => EMPTY,
  );
}

// Blocks someone and drops them from what this page shows at once.
export async function blockUser(user: BlockedUser) {
  await api.put(`/api/users/${user.id}/block`);
  set([user, ...state.users.filter((u) => u.id !== user.id)]);
}

export async function unblockUser(userId: number) {
  await api.delete(`/api/users/${userId}/block`);
  set(state.users.filter((u) => u.id !== userId));
}
