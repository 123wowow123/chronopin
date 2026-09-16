'use client';

// The signed-in user's unread notification count, shared by the navbar bell
// and the mobile drawer. One poll, every minute while the tab is visible, runs
// while anything is showing the count.

import { useSyncExternalStore } from 'react';
import { api } from './api';

const POLL_MS = 60_000;

let unread = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function set(next: number) {
  if (next === unread) return;
  unread = next;
  listeners.forEach((l) => l());
}

function refreshUnreadCount() {
  api
    .get<{ unreadCount: number }>('/api/notifications/unread-count')
    .then((res) => set(res.unreadCount))
    .catch(() => {});
}

// After the list has been opened and marked read.
export function clearUnreadCount() {
  set(0);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    refreshUnreadCount();
    timer = setInterval(() => {
      if (!document.hidden) refreshUnreadCount();
    }, POLL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const noSubscribe = () => () => {};

// The count, or 0 without polling when there is nobody signed in to ask for.
export function useUnreadCount(signedIn: boolean) {
  const count = useSyncExternalStore(signedIn ? subscribe : noSubscribe, () => unread, () => 0);
  return signedIn ? count : 0;
}
