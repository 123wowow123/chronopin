'use client';

// Which pins the viewer likes, for cards that came off a page cached for
// everyone. Same reasoning as session.ts: the server HTML never depends on
// who is reading, so the browser asks once it knows. Every id wanted in the
// same tick goes in one request, so a page of cards costs one call rather
// than one per card.

import { useCallback, useSyncExternalStore } from 'react';
import { api } from './api';
import { useSession } from './session';

const liked = new Map<number, boolean>();
const listeners = new Set<() => void>();
let wanted = new Set<number>();
let scheduled = false;

function announce() {
  listeners.forEach((listener) => listener());
}

function flush() {
  scheduled = false;
  const ids = [...wanted];
  wanted = new Set();
  if (!ids.length) {
    return;
  }
  api
    .get<{ liked: number[] }>(`/api/pins/liked?ids=${ids.join(',')}`)
    .then(({ liked: mine }) => {
      const has = new Set(mine);
      ids.forEach((id) => liked.set(id, has.has(id)));
      announce();
    })
    // Left unknown rather than answered wrongly: the button keeps showing the
    // count and simply does not light up, and a later card asks again.
    .catch(() => undefined);
}

function want(id: number) {
  if (liked.has(id) || wanted.has(id)) {
    return;
  }
  wanted.add(id);
  if (!scheduled) {
    scheduled = true;
    // A timeout rather than a microtask: a page of cards can mount over more
    // than one commit, and they should still share the one request.
    setTimeout(flush, 0);
  }
}

const changeListeners = new Set<(pinId: number, value: boolean) => void>();

// After the viewer likes or unlikes a pin, so its other cards agree.
export function setLiked(pinId: number, value: boolean) {
  liked.set(pinId, value);
  announce();
  changeListeners.forEach((listener) => listener(pinId, value));
}

// Each setLiked, for a button that keeps its own state (one that looked
// itself up) but should still follow a like made elsewhere on the page.
export function onLikedChange(listener: (pinId: number, value: boolean) => void) {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

// Whether this viewer likes the pin: undefined until it is known, and
// false for a signed-out reader, who likes nothing. Pass undefined for a
// pin that already carries its own state and needs no lookup.
export function useLiked(pinId: number | undefined): boolean | undefined {
  const { isLoggedIn } = useSession();
  const subscribe = useCallback(
    (listener: () => void) => {
      listeners.add(listener);
      if (pinId !== undefined && isLoggedIn) {
        want(pinId);
      }
      return () => {
        listeners.delete(listener);
      };
    },
    [pinId, isLoggedIn],
  );
  const known = useSyncExternalStore(
    subscribe,
    () => (pinId === undefined ? undefined : liked.get(pinId)),
    () => undefined,
  );
  if (pinId === undefined) {
    return undefined;
  }
  return isLoggedIn ? known : false;
}
