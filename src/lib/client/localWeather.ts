'use client';

// The viewer's own weather, for the bell (a peek icon on it and the top row
// of its menu). It loads itself on the first page that shows it, with no
// location prompt: the browser's position is used only where permission was
// already granted, then the default location saved on the account (0066),
// and otherwise the weather is the one in the city of the viewer's time zone,
// which the browser gives away for free. The button is what is left when even
// that finds nothing.

import { useSyncExternalStore } from 'react';
import { browserTimeZone } from './timeZone';
import { sessionUser } from './session';
import { userLocation } from '@/lib/location';
import type { LocalWeatherJson } from '@/lib/weather';

export type LocalWeatherState =
  | { status: 'idle' } // not checked yet
  | { status: 'ask' } // nothing automatic worked; offer the button
  | { status: 'loading' }
  | { status: 'off' } // denied, unsupported or failed: show nothing
  | { status: 'ready'; weather: LocalWeatherJson };

// Refetched when the menu opens after this long.
const STALE_MS = 15 * 60 * 1000;

let state: LocalWeatherState = { status: 'idle' };
let fetchedAt = 0;
// Whether what is shown came from the browser's own position, so a refresh
// asks the same way again.
let fromBrowser = false;
// Whether pressing the button could still get a position.
let canAsk = false;
let started = false;
const listeners = new Set<() => void>();

function set(next: LocalWeatherState) {
  state = next;
  listeners.forEach((l) => l());
}

function position(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition((p) => resolve(p.coords), reject, { maximumAge: STALE_MS, timeout: 15000 }),
  );
}

// The weather where the viewer is: from their position when `browser` is set
// (rounded here too, so no finer position leaves the device), else from the
// account's default location, else from the city their time zone names.
async function load(browser: boolean) {
  if (state.status !== 'ready') set({ status: 'loading' });
  try {
    let query = `tz=${encodeURIComponent(browserTimeZone())}`;
    // The default location's name, shown as the place the weather is for.
    let place: string | null | undefined;
    if (browser) {
      const coords = await position();
      query = `lat=${coords.latitude.toFixed(2)}&lon=${coords.longitude.toFixed(2)}`;
    } else {
      const saved = userLocation(await sessionUser());
      if (saved) {
        query = `lat=${saved.latitude.toFixed(2)}&lon=${saved.longitude.toFixed(2)}`;
        place = saved.name;
      }
    }
    const res = await fetch(`/api/weather?${query}`);
    if (res.status !== 200) throw new Error(`weather ${res.status}`);
    fetchedAt = Date.now();
    fromBrowser = browser;
    const weather = (await res.json()) as LocalWeatherJson;
    set({ status: 'ready', weather: place === undefined ? weather : { ...weather, place } });
  } catch {
    // A refresh that fails keeps the weather already shown.
    if (state.status === 'ready') return;
    // No position, for whatever reason: the time zone still knows a city.
    if (browser) return void load(false);
    set({ status: canAsk ? 'ask' : 'off' });
  }
}

// Whether the browser would prompt, grant or refuse a position, without
// asking for one.
async function permission(): Promise<PermissionState> {
  if (!navigator.geolocation) return 'denied';
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state;
  } catch {
    // No Permissions API: the button asks.
    return 'prompt';
  }
}

async function start() {
  if (started || typeof navigator === 'undefined') return;
  started = true;
  const granted = await permission();
  canAsk = granted === 'prompt';
  void load(granted === 'granted');
}

// Asks for the position (the viewer pressed the button).
export function requestLocalWeather() {
  void load(true);
}

// Looks again now - after the profile changes the default location. Before
// the weather has first loaded there is nothing to redo.
export function reloadLocalWeather() {
  if (started && state.status !== 'loading') void load(fromBrowser);
}

// Brings the weather up to date when the menu opens.
export function refreshLocalWeather() {
  if (state.status === 'ready' && Date.now() - fetchedAt > STALE_MS) void load(fromBrowser);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void start();
  return () => listeners.delete(listener);
}

const idle: LocalWeatherState = { status: 'idle' };

export function useLocalWeather(): LocalWeatherState {
  return useSyncExternalStore(subscribe, () => state, () => idle);
}
