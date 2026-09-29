'use client';

// Roughly where the viewer is, for measuring how far away a pin is.
//
// Like the bell's weather (see localWeather), it asks for nothing: the
// browser's position is used only where permission was already granted; then
// the default location saved on the account (0066, set on the profile); and
// otherwise the viewer is in the city their time zone names, which the
// browser gives away for free. None is precise, and none needs to be — the
// answer is read as "about this far".
//
// A granted position also keeps the account's default location up to date,
// while the profile allows it, once it has moved far enough to matter
// (MOVED_KM): that is the location the other devices and pages fall back to.

import { hasMoved, userLocation } from '@/lib/location';
import { refreshSession, sessionUser } from './session';
import { browserTimeZone } from './timeZone';

export type ViewerPlace = {
  latitude: number;
  longitude: number;
  // The city a time-zone reading is for, or the name of the account's default
  // location, to say what the distance is from; absent for the viewer's own
  // position, which is theirs to name, unless it is where that location is.
  name?: string | null;
  source: 'device' | 'account' | 'timeZone';
};

// One lookup per page load, shared by everything that asks. A lookup that
// finds nothing is forgotten rather than kept: the app answers every pin
// without reloading, so a single bad moment (a server restarting, a dropped
// request) would otherwise leave every later pin with no distance at all.
let pending: Promise<ViewerPlace | null> | null = null;

export function viewerPlace(): Promise<ViewerPlace | null> {
  pending ??= resolve().then((place) => {
    if (!place) pending = null;
    return place;
  });
  return pending;
}

// Forgets the place found, so the next ask looks again - after the profile
// changes the default location.
export function forgetViewerPlace() {
  pending = null;
}

async function resolve(): Promise<ViewerPlace | null> {
  const [device, user] = await Promise.all([grantedPosition(), sessionUser()]);
  const saved = userLocation(user);
  if (device) {
    const moved = hasMoved(saved, device);
    if (user && user.locationFromDevice !== false && moved) void follow(user.id, device);
    return { ...device, name: moved ? null : saved!.name, source: 'device' };
  }
  if (saved) return { latitude: saved.latitude, longitude: saved.longitude, name: saved.name, source: 'account' };
  return timeZonePlace();
}

// Moves the account's default location to where the device is. Quietly: the
// device's own position is already what this page measures from, and a
// failure only means the other pages keep the older place a while longer.
async function follow(userId: number, at: { latitude: number; longitude: number }) {
  try {
    const res = await fetch(`/api/users/${userId}/preferences`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: { latitude: at.latitude, longitude: at.longitude, fromDevice: true } }),
    });
    if (res.ok) await refreshSession();
  } catch {
    // Offline or signed out meanwhile: the next page load tries again.
  }
}

// The browser's own position, but only where it costs no prompt.
async function grantedPosition(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  try {
    if ((await navigator.permissions.query({ name: 'geolocation' })).state !== 'granted') return null;
  } catch {
    // No Permissions API: asking would prompt, so it is the time zone's turn.
    return null;
  }
  try {
    // A short wait: with Location Services off for the browser the
    // permission still reads as granted, and the time zone is the better
    // answer sooner than it is a late one.
    const coords = await new Promise<GeolocationCoordinates>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition((p) => resolve(p.coords), reject, { maximumAge: 15 * 60 * 1000, timeout: 8000 }),
    );
    // Rounded to about a kilometre, so no finer position leaves the device.
    return { latitude: Math.round(coords.latitude * 100) / 100, longitude: Math.round(coords.longitude * 100) / 100 };
  } catch {
    return null;
  }
}

async function timeZonePlace(): Promise<ViewerPlace | null> {
  try {
    const res = await fetch(`/api/place?tz=${encodeURIComponent(browserTimeZone())}`);
    // 204 for a zone that names no city (UTC, Etc/GMT+5).
    return res.status === 200 ? { ...((await res.json()) as Omit<ViewerPlace, 'source'>), source: 'timeZone' } : null;
  } catch {
    return null;
  }
}
