import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, noContent, readJson, route } from '@/server/http';
import PushSubscription from '@/server/model/pushSubscription';

// A browser's Web Push subscription, as PushSubscription.toJSON() gives it:
// { endpoint, keys: { p256dh, auth } }. Push services are https only.
function parse(body: unknown) {
  const { endpoint, keys } = (body ?? {}) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || endpoint.length > 2000) {
    throw new HttpError(400, '', { message: 'endpoint must be an https URL' });
  }
  return { endpoint, p256dh: keys?.p256dh, auth: keys?.auth };
}

// Alerts about the signed-in user's watched pins go to this browser.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const { endpoint, p256dh, auth } = parse(await readJson(request));
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) {
    throw new HttpError(400, '', { message: 'keys.p256dh and keys.auth are required' });
  }
  await PushSubscription.save(user.id, { endpoint, p256dh, auth });
  return noContent();
});

// No more alerts to this browser: signing out, or switching them off.
export const DELETE = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const { endpoint } = parse(await readJson(request));
  await PushSubscription.remove(user.id, endpoint);
  return noContent();
});
