'use client';

// The viewer's own weather, for the bell (a peek icon on it and the top row
// of its menu). Uses the browser's location, but only asks for it when the
// viewer presses "Show local weather": on load it is read only if permission
// was already granted, so no page ever opens with a location prompt.

import { useSyncExternalStore } from 'react';
import type { LocalWeatherJson } from '@/lib/weather';

export type LocalWeatherState =
  | { status: 'idle' } // not checked yet
  | { status: 'ask' } // the browser would prompt; offer the button
  | { status: 'loading' }
  | { status: 'off' } // denied, unsupported or failed: show nothing
  | { status: 'ready'; weather: LocalWeatherJson };

// Refetched when the menu opens after this long.
const STALE_MS = 15 * 60 * 1000;

let state: LocalWeatherState = { status: 'idle' };
let fetchedAt = 0;
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

async function load() {
  if (state.status !== 'ready') set({ status: 'loading' });
  try {
    const coords = await position();
    // Rounded here too, so no finer position leaves the device.
    const res = await fetch(`/api/weather?lat=${coords.latitude.toFixed(2)}&lon=${coords.longitude.toFixed(2)}`);
    if (res.status !== 200) throw new Error(`weather ${res.status}`);
    fetchedAt = Date.now();
    set({ status: 'ready', weather: (await res.json()) as LocalWeatherJson });
  } catch (err) {
    // A refresh that fails keeps the weather already shown.
    if (state.status !== 'ready') set({ status: (err as GeolocationPositionError)?.code === 1 ? 'off' : 'ask' });
  }
}

async function start() {
  if (started || typeof navigator === 'undefined') return;
  started = true;
  if (!navigator.geolocation) return set({ status: 'off' });
  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    if (permission.state === 'granted') return void load();
    set({ status: permission.state === 'denied' ? 'off' : 'ask' });
  } catch {
    // No Permissions API: the button asks.
    set({ status: 'ask' });
  }
}

// Asks for the location (the viewer pressed the button).
export function requestLocalWeather() {
  void load();
}

// Brings the weather up to date when the menu opens.
export function refreshLocalWeather() {
  if (state.status === 'ready' && Date.now() - fetchedAt > STALE_MS) void load();
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
