'use client';

// Browser notifications about the pins the signed-in user watches: when one
// starts, and 15 minutes before for those who asked (the server decides which,
// src/server/services/watchAlerts.ts). They reach this browser two ways, both
// shown by the service worker (public/sw.js):
//
//   - Web Push, when the server has VAPID keys and the browser subscribed:
//     arrives with the site closed.
//   - The live feed's `alert` event, to an open page: the only way without
//     push, and shown only then - a subscribed browser gets the push anyway.
//
// Asking for permission needs a click (Watch, or the preference), so nothing
// here asks on its own.

import { api } from './api';

export type AlertPermission = NotificationPermission | 'unsupported';

type Alert = { title: string; body: string; url: string; image: string | null; tag: string };

let registering: Promise<ServiceWorkerRegistration | null> | null = null;
let publicKey: Promise<string | null> | null = null;

export function alertPermission(): AlertPermission {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  return Notification.permission;
}

function registration(): Promise<ServiceWorkerRegistration | null> {
  registering ??= navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then(() => navigator.serviceWorker.ready)
    .catch(() => null);
  return registering;
}

function serverKey(): Promise<string | null> {
  publicKey ??= api
    .get<{ publicKey: string | null }>('/api/push')
    .then((res) => res.publicKey)
    .catch(() => {
      publicKey = null;
      return null;
    });
  return publicKey;
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function base64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Subscribes this browser to Web Push and tells the server it belongs to the
// signed-in user - again on every page load, so a browser someone else signed
// in on moves to whoever is signed in now. False when push is not to be had
// (no server key, no PushManager, or the browser refused).
async function subscribePush(): Promise<boolean> {
  const [reg, key] = await Promise.all([registration(), serverKey()]);
  if (!reg || !key || !('pushManager' in reg)) return false;
  try {
    let sub = await reg.pushManager.getSubscription();
    // A subscription made with another key (the server's changed) is useless.
    const current = sub?.options.applicationServerKey;
    if (sub && current && base64url(current) !== key.replace(/=+$/, '')) {
      await sub.unsubscribe();
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
    await api.post('/api/push/subscription', sub.toJSON());
    return true;
  } catch {
    return false;
  }
}

// Whether this browser gets alerts by push, so the live feed's copies are not
// shown twice. Settled once per page load by syncAlerts.
let pushed: Promise<boolean> = Promise.resolve(false);

// Asks for permission (call it from a click) and, once given, sets up push.
// Answers with where permission stands.
export async function enableAlerts(): Promise<AlertPermission> {
  const now = alertPermission();
  if (now === 'unsupported' || now === 'denied') return now;
  const answer = now === 'granted' ? now : await Notification.requestPermission();
  if (answer === 'granted') pushed = subscribePush();
  return answer;
}

// On load for a signed-in user who allowed notifications before.
export function syncAlerts() {
  if (alertPermission() === 'granted') pushed = subscribePush();
}

// Signing out: this browser stops hearing about the user's pins. Bounded, as
// the page is about to leave.
export async function forgetAlerts(): Promise<void> {
  if (alertPermission() !== 'granted') return;
  const reg = await Promise.race([registration(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000))]);
  const sub = await reg?.pushManager?.getSubscription().catch(() => null);
  if (!sub) return;
  await Promise.race([
    fetch('/api/push/subscription', {
      method: 'DELETE',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);
}

// An alert from the live feed, shown unless a push brings the same one.
export async function showLiveAlert(alert: Alert): Promise<void> {
  if (alertPermission() !== 'granted' || (await pushed)) return;
  const reg = await registration();
  const options: NotificationOptions & { image?: string } = {
    body: alert.body,
    icon: '/favicon.ico',
    image: alert.image ?? undefined,
    tag: alert.tag,
    data: { url: alert.url },
  };
  if (reg) {
    await reg.showNotification(alert.title, options).catch(() => undefined);
    return;
  }
  const shown = new Notification(alert.title, options);
  shown.onclick = () => {
    window.focus();
    window.location.assign(alert.url);
  };
}
