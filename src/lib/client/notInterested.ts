'use client';

// The pins the signed-in reader marked "Not interested" (0077), for client
// components: the timeline, search and "More like this" leave them out.
// Fetched once per page load, after the session is known, and shared. A pin
// marked on this page is "just hidden" instead: its card folds to a line with
// Undo rather than vanishing under the reader's pointer.

import { useSyncExternalStore } from 'react';
import { api } from './api';
import { sessionUser } from './session';

type State = { ids: ReadonlySet<number>; justHidden: ReadonlySet<number> };

const EMPTY: State = { ids: new Set(), justHidden: new Set() };
let state: State = EMPTY;
let request: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function load() {
  if (!request) {
    request = sessionUser()
      .then((user) => (user ? api.get<number[]>('/api/users/me/not-interested') : []))
      .catch(() => [])
      .then((ids) => set({ ids: new Set(ids), justHidden: state.justHidden }));
  }
  return request;
}

export function useNotInterested(): State {
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

export async function markNotInterested(pinId: number) {
  await api.put(`/api/pins/${pinId}/not-interested`);
  set({ ids: new Set([...state.ids, pinId]), justHidden: new Set([...state.justHidden, pinId]) });
}

export async function undoNotInterested(pinId: number) {
  await api.delete(`/api/pins/${pinId}/not-interested`);
  const ids = new Set(state.ids);
  const justHidden = new Set(state.justHidden);
  ids.delete(pinId);
  justHidden.delete(pinId);
  set({ ids, justHidden });
}
