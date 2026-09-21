'use client';

// Roughly where the viewer is, for measuring how far away a pin is.
//
// Like the bell's weather (see localWeather), it asks for nothing: the
// browser's position is used only where permission was already granted, and
// otherwise the viewer is in the city their time zone names, which the
// browser gives away for free. Neither is precise, and neither needs to be —
// the answer is read as "about this far".

import { browserTimeZone } from './timeZone';

export type ViewerPlace = {
  latitude: number;
  longitude: number;
  // The city a time-zone reading is for, to say what the distance is from;
  // absent for the viewer's own position, which is theirs to name.
  name?: string | null;
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

async function resolve(): Promise<ViewerPlace | null> {
  return (await grantedPosition()) ?? (await timeZonePlace());
}

// The browser's own position, but only where it costs no prompt.
async function grantedPosition(): Promise<ViewerPlace | null> {
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
    return res.status === 200 ? ((await res.json()) as ViewerPlace) : null;
  } catch {
    return null;
  }
}
