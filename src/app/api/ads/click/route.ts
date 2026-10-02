import { userAgent, type NextRequest } from 'next/server';
import { AMAZON_STORES, isAdSlot } from '@/lib/ads';
import { getUser } from '@/server/auth';
import { clientIp, HttpError, noContent, readJson, route } from '@/server/http';
import Ad from '@/server/model/ad';

// Records a click on an ad, for the admin Ads page. Sent with sendBeacon as
// the store opens in a new tab, so the answer is always an empty 204. Body
// { key, slot, pinId?, page?, store? }: the ad's key as served, the slot it was in,
// the pin whose page that was and the page's path. What the ad is and where it went are looked up
// from the key, not taken from the body. Crawlers are ignored.
export const POST = route(async (request: NextRequest) => {
  if (userAgent(request).isBot) return noContent();
  const body = await readJson(request);
  const key = typeof body.key === 'string' && /^(ad|m|p):\d+$/.test(body.key) ? body.key : null;
  if (!key || !isAdSlot(body.slot)) throw new HttpError(400, 'key and slot are required.');
  const pinId = Number.isInteger(body.pinId) && body.pinId > 0 ? (body.pinId as number) : null;
  const page = typeof body.page === 'string' && body.page.startsWith('/') ? body.page.slice(0, 500) : null;
  // The store the ad was served from, so a click counts where its impression did.
  const store = typeof body.store === 'string' && AMAZON_STORES[body.store] ? body.store : null;
  const user = await getUser(request);
  await Ad.recordClick({ adKey: key, slot: body.slot, pinId, userId: user ? Number(user.id) : null, ip: clientIp(request), page, store });
  return noContent();
});
