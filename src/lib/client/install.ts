'use client';

// Installing the site as an app on the phone ("Add to Home Screen"): what the
// manifest (src/app/manifest.ts) makes possible. Chromium browsers hand the
// page a one-shot `beforeinstallprompt` event, which has to be caught as the
// page loads and kept until someone clicks; Safari offers nothing like it, so
// on iPhone and iPad the page can only say where the Share menu is. There the
// installed app is also the only place Web Push works (iOS 16.4+).

import { useSyncExternalStore } from 'react';

export type InstallState = 'installed' | 'prompt' | 'ios' | 'none';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: InstallEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

// Opened from the home screen rather than in a browser tab.
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

function isIos() {
  // iPadOS 13+ says it is a Mac; only a touch screen gives it away.
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

if (typeof window !== 'undefined') {
  installed = isStandalone();
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function state(): InstallState {
  if (installed) return 'installed';
  if (deferred) return 'prompt';
  return isIos() ? 'ios' : 'none';
}

// Unknown (null) on the server, which cannot see the browser.
export function useInstallState(): InstallState | null {
  return useSyncExternalStore(subscribe, state, () => null);
}

// Shows the browser's own install dialog. Call it from a click.
export async function promptInstall(): Promise<void> {
  const event = deferred;
  if (!event) return;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // The event works once, accepted or not; the browser fires a new one later.
  deferred = null;
  if (outcome === 'accepted') installed = true;
  notify();
}
