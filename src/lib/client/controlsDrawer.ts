'use client';

import { useSyncExternalStore } from 'react';

// Below lg the timeline's filters ride in the nav drawer, and the two are in
// different trees: the drawer is the layout's, the filters are the page's.
// They meet here - the drawer lends the page an element to fill (a portal, so
// the controls keep the page's contexts and state), and the page says whether
// it has any, so the drawer only shows the section when something is there.
//
// React keeps the pages either side of the one showing mounted but hidden,
// and each of them has controls of its own; a hidden page's effects are torn
// down, so the page that registered last is the one on screen, and the only
// one that fills the drawer.

let slot: HTMLElement | null = null;
const claims: object[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The drawer's ref callback: React hands it the element, then null.
export function setControlsSlot(element: HTMLElement | null) {
  slot = element;
  emit();
}

export function useControlsSlot() {
  return useSyncExternalStore(
    subscribe,
    () => slot,
    () => null,
  );
}

// What rides with the filters without being one (the search page's searched
// user and company) has a section of its own, above the filters, so it reads
// as what the page is about rather than one more thing to narrow it by.
let cardsSlot: HTMLElement | null = null;

export function setCardsSlot(element: HTMLElement | null) {
  cardsSlot = element;
  emit();
}

export function useCardsSlot() {
  return useSyncExternalStore(
    subscribe,
    () => cardsSlot,
    () => null,
  );
}

// Called from an effect with a token of the page's own; it lets go when the
// page unmounts or is hidden.
export function registerControls(claim: object) {
  claims.push(claim);
  emit();
  return () => {
    const at = claims.lastIndexOf(claim);
    if (at !== -1) claims.splice(at, 1);
    emit();
  };
}

// Whether these are the controls the drawer is showing.
export function useOwnsControls(claim: object) {
  return useSyncExternalStore(
    subscribe,
    () => claims[claims.length - 1] === claim,
    () => false,
  );
}

export function useHasControls() {
  return useSyncExternalStore(
    subscribe,
    () => claims.length > 0,
    () => false,
  );
}

// Asks the drawer to shut, from something its controls open that must not sit
// under it (the big tag cloud, which stays below the navbar so the search box
// is in reach, and so below the drawer too).
const closers = new Set<() => void>();

export function onCloseDrawer(close: () => void) {
  closers.add(close);
  return () => {
    closers.delete(close);
  };
}

export function closeDrawer() {
  for (const close of closers) close();
}

// A pick in the drawer's tag list is a search, so a navigation - and both
// halves of a navigation used to move the drawer out from under the finger:
//
// * The drawer shuts on any change of page, and a first pick goes from the
//   timeline to /search (and clearing the last tag back again). So a pick
//   holds it open across the navigation it starts.
// * The controls are the page's, portalled into the drawer, and the new
//   page's take the slot only after the old page's are hidden. In between
//   the search page lays itself out (its today hold's scrollIntoView), and
//   the browser clamps the drawer's scroll to its then-empty content: back to
//   the top. So a pick notes where the drawer was, and the new page's
//   controls put it back as they fill the slot, before anything is painted.
const HOLD_MS = 5000;
let heldUntil = 0;
let heldScroll: number | null = null;
let scroller: HTMLElement | null = null;

// The drawer's ref callback for its scrolling panel.
export function setDrawerScroller(element: HTMLElement | null) {
  scroller = element;
}

export function holdDrawerForPick() {
  heldUntil = Date.now() + HOLD_MS;
  heldScroll = scroller?.scrollTop ?? null;
}

// Whether a change of page now is a pick's, which leaves the drawer open.
export function drawerHeld() {
  return Date.now() < heldUntil;
}

// From the controls' layout effect once they fill the slot.
export function restoreDrawerScroll() {
  if (heldScroll === null || !scroller || !drawerHeld()) return;
  scroller.scrollTop = heldScroll;
}

// The big tag cloud is opened from the drawer on a phone, and put the drawer
// away to be seen. Closing it comes back to the drawer as it was left - its
// scroll noted on the way out, since picks in the cloud swap the page's
// controls in the drawer and can leave it at the top.
const openers = new Set<() => void>();
let leftAt: number | null = null;

export function onOpenDrawer(open: () => void) {
  openers.add(open);
  return () => {
    openers.delete(open);
  };
}

export function leaveDrawerForCloud() {
  leftAt = scroller?.scrollTop ?? null;
  closeDrawer();
}

export function returnToDrawer() {
  for (const open of openers) open();
  const top = leftAt;
  leftAt = null;
  // Once the drawer is open again and the controls are in it.
  requestAnimationFrame(() => {
    if (scroller && top !== null) scroller.scrollTop = top;
  });
}

// The big tag cloud, opened by what stands for the tag list when an admin has
// turned the list off (src/lib/tagList.ts): the tags pill between lg and xl
// lives in the floating controls, the cloud's state in the tag panel.
const cloudOpeners = new Set<() => void>();

export function onOpenTagCloud(open: () => void) {
  cloudOpeners.add(open);
  return () => {
    cloudOpeners.delete(open);
  };
}

export function openTagCloud() {
  for (const open of cloudOpeners) open();
}
