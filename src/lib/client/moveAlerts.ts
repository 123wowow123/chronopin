'use client';

import { useSyncExternalStore } from 'react';
import { api } from './api';
import type { MoveAlertRow, MoveKind } from '@/lib/moveAlerts';

// The reader's Premium price and odds alerts on a pin, shared by every button
// on the page: one read, and a change made at one is seen by the others.
type State = { ready: boolean; premium: boolean; alerts: MoveAlertRow[] };

const empty: State = { ready: false, premium: false, alerts: [] };
const states = new Map<number, State>();
const loading = new Set<number>();
const listeners = new Set<() => void>();

function put(pinId: number, state: State) {
  states.set(pinId, state);
  listeners.forEach((l) => l());
}

export function loadMoveAlerts(pinId: number) {
  if (states.has(pinId) || loading.has(pinId)) return;
  loading.add(pinId);
  api
    .get<{ premium: boolean; alerts: MoveAlertRow[] }>(`/api/move-alerts?pinId=${pinId}`)
    .then((answer) => put(pinId, { ready: true, ...answer }))
    .catch(() => put(pinId, { ready: true, premium: false, alerts: [] }))
    .finally(() => loading.delete(pinId));
}

// Forget what was read (signing in or out changes the answer).
export function resetMoveAlerts() {
  states.clear();
  listeners.forEach((l) => l());
}

export function useMoveAlerts(pinId: number, enabled: boolean): State {
  const state = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => states.get(pinId) ?? empty,
    () => empty,
  );
  if (enabled && !state.ready) queueMicrotask(() => loadMoveAlerts(pinId));
  return state;
}

export async function saveMoveAlert(pinId: number, body: { kind: MoveKind; market?: string; symbol?: string; threshold: number }) {
  const saved = await api.post<MoveAlertRow>('/api/move-alerts', { ...body, pinId });
  const state = states.get(pinId) ?? empty;
  put(pinId, { ...state, ready: true, alerts: [saved, ...state.alerts.filter((a) => a.id !== saved.id)] });
  return saved;
}

export async function removeMoveAlert(pinId: number, id: number) {
  await api.delete(`/api/move-alerts/${id}`);
  const state = states.get(pinId) ?? empty;
  put(pinId, { ...state, alerts: state.alerts.filter((a) => a.id !== id) });
}
