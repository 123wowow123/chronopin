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
