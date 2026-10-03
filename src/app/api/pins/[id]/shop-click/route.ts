import { userAgent, type NextRequest } from 'next/server';
import { getUser, isAdmin } from '@/server/auth';
import { clientIp, HttpError, intParam, noContent, readJson, route } from '@/server/http';
import ShopClick from '@/server/model/shopClick';

type Ctx = RouteContext<'/api/pins/[id]/shop-click'>;

// Records a click on one of a pin's buy buttons, for the admin Clicks page.
// Sent by the button itself with sendBeacon as the store opens in a new tab,
// so the answer is always an empty 204 and nothing waits for it. Body
// { store, url, search, price?, currency? }: what the button showed. Crawlers
// and admins are ignored. Who clicked is the signed-in user, and the address either way.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  if (userAgent(request).isBot) return noContent();
  const body = await readJson(request);
  const store = typeof body.store === 'string' ? body.store.trim().slice(0, 80) : '';
  const url = typeof body.url === 'string' ? body.url : '';
  if (!store || !/^https?:\/\//i.test(url) || url.length > 2000) throw new HttpError(400, 'store and an http(s) url are required.');
  const price = typeof body.price === 'number' && Number.isFinite(body.price) && body.price > 0 && body.price < 1e10 ? body.price : null;
  const currency = typeof body.currency === 'string' && /^[A-Z]{3}$/.test(body.currency) ? body.currency : null;
  const user = await getUser(request);
  if (isAdmin(user)) return noContent();
  await ShopClick.record({
    pinId,
    store,
    url,
    search: body.search === true,
    price,
    currency: price ? (currency ?? 'USD') : null,
    userId: user ? Number(user.id) : null,
    ip: clientIp(request),
  });
  return noContent();
});
