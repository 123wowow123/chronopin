'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useTodayHold } from '@/lib/client/todayHold';

// What a signed-out reader was in the middle of doing when they were sent off
// to log in, so that finishing the login does it rather than dropping it.
//
// Its companion is returnSpot, which keeps where the reader was; this keeps
// what they had just clicked. Logging in is a full page load, so it waits in
// sessionStorage rather than in memory, and the button that can carry it out
// takes it once the reader is back and known.

const KEY = 'pendingAction';
// The same life as a return spot: a click older than that is not what the
// reader came back for.
const MAX_AGE_MS = 15 * 60_000;

// The clicks worth finishing: watching a pin, following a person or a
// company, and starting a comment or a suggestion. Each is one thing, named
// by its id.
export type PendingAction = { kind: 'watch' | 'followUser' | 'followCompany' | 'comment' | 'suggest'; id: number };
type Saved = PendingAction & { savedAt: number };

export function savePendingAction(action: PendingAction) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...action, savedAt: Date.now() } satisfies Saved));
  } catch {
    // Without storage the reader clicks again, as they do today.
  }
}

function clearPendingAction() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

// Whether the click waiting here was this one, taken as it is read: the same
// pin or person can have more than one button on the page, and only one of
// them should do it.
function takePendingAction({ kind, id }: PendingAction): boolean {
  const pending = read();
  if (pending?.kind !== kind || pending.id !== id) {
    return false;
  }
  clearPendingAction();
  return true;
}

function read(): Saved | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const pending = raw ? (JSON.parse(raw) as Saved) : null;
    return pending && Date.now() - pending.savedAt < MAX_AGE_MS ? pending : null;
  } catch {
    return null;
  }
}

// Carries out the click that sent the reader off to log in, now they are back
// and known, and brings what they clicked on back in front of them. `ready` is
// the viewer being logged in; `run` does the click, taking the button it was
// clicked on, and may return a promise, which is waited for so the button
// shows its new state before it is scrolled to. The returned ref goes on the
// button.
//
// Taken as it is read, so the click happens once however many of the pin's
// cards are on the page, and never cancelled: the watch, or the follow, is the
// reader's, not this button's.
export function usePendingAction<T extends HTMLElement>(action: PendingAction, ready: boolean, run: (element: T | null) => unknown) {
  const ref = useRef<T>(null);
  const latest = useRef(run);
  useLayoutEffect(() => {
    latest.current = run;
  });
  // The element is kept in view while the page settles around it: the same
  // hold the timeline opens on a card with, as pictures and embeds still move
  // it.
  const hold = useTodayHold(useCallback(() => showAgain(ref.current), []));
  const { kind, id } = action;

  useEffect(() => {
    if (!ready || !takePendingAction({ kind, id })) return;
    Promise.resolve(latest.current(ref.current)).then(
      () => hold(),
      () => {},
    );
  }, [ready, kind, id, hold]);

  return ref;
}

// Brings what the reader clicked back in front of them, so they can see it
// took: signing in reloads the page, which opens at the top however far down
// the button was. A page that puts the reader back itself (the timeline, a
// search) leaves it on screen already, and is left alone.
//
// A button in a card comes back with its whole card, so the reader sees which
// pin they watched. Only an article in a list is a card: a pin's own page is
// an article too, and is the page rather than something to scroll to.
function showAgain(element: HTMLElement | null) {
  const article = element?.closest('article');
  const target = (article?.closest('[role="listitem"], li') ? article : element) ?? null;
  if (!target) return;
  const box = target.getBoundingClientRect();
  if (box.top >= 0 && box.bottom <= window.innerHeight) return;
  target.scrollIntoView({ block: box.height > window.innerHeight * 0.8 ? 'start' : 'center' });
}
