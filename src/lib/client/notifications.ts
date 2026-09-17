'use client';

// The signed-in user's unread notification count, shared by the navbar bell
// and the mobile drawer. Pushed over the page's live stream
// (src/lib/client/liveFeed.ts): on connecting, and whenever a notification
// arrives, is taken back or is read (in any tab).

import { useSyncExternalStore } from 'react';
import { onLive } from './liveFeed';

let unread = 0;
let stopFeed: (() => void) | null = null;
const listeners = new Set<() => void>();

function set(next: number) {
  if (next === unread) return;
  unread = next;
  listeners.forEach((l) => l());
}

// After the list has been opened and marked read, ahead of the push that
// confirms it.
export function clearUnreadCount() {
  set(0);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  stopFeed ??= onLive<{ unreadCount: number }>('notifications', ({ unreadCount }) => set(unreadCount));
  return () => {
    listeners.delete(listener);
    if (!listeners.size && stopFeed) {
      stopFeed();
      stopFeed = null;
    }
  };
}

const noSubscribe = () => () => {};

// The count, or 0 without listening when there is nobody signed in to ask for.
export function useUnreadCount(signedIn: boolean) {
  const count = useSyncExternalStore(signedIn ? subscribe : noSubscribe, () => unread, () => 0);
  return signedIn ? count : 0;
}
