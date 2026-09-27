import webpush from 'web-push';
import config from './config';
import PushSubscription from './model/pushSubscription';
import log from './util/log';

// Web Push: a notification to every browser a user allowed them in, whether
// or not the site is open there. The browser's service worker (public/sw.js)
// shows it. Needs the VAPID keys (config.webPush); without them this does
// nothing and alerts reach only open pages, over the live feed.

export type PushPayload = { title: string; body: string; url: string; image: string | null; tag: string };

// A push the browser has not been reachable for in this long is dropped: an
// alert about something starting now is no use an hour later.
const TTL_SECONDS = 15 * 60;

export function pushEnabled() {
  return Boolean(config.webPush.publicKey && config.webPush.privateKey);
}

export function pushPublicKey(): string | null {
  return pushEnabled() ? config.webPush.publicKey : null;
}

export async function pushToUser(userId: number, payload: PushPayload): Promise<void> {
  if (!pushEnabled()) return;
  const targets = await PushSubscription.forUser(userId);
  const body = JSON.stringify(payload);
  const vapidDetails = { subject: config.webPush.subject, publicKey: config.webPush.publicKey, privateKey: config.webPush.privateKey };
  await Promise.all(
    targets.map(async (target) => {
      try {
        await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, body, {
          TTL: TTL_SECONDS,
          urgency: 'high',
          topic: payload.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32),
          vapidDetails,
        });
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // Gone: the browser unsubscribed, or its push service expired it.
        if (status === 404 || status === 410) {
          await PushSubscription.forget(target.endpoint);
        } else {
          log.warn(`push to user ${userId} failed (${status ?? 'no status'}):`, (err as Error).message);
        }
      }
    }),
  );
}
