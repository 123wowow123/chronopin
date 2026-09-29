import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Merchant from '@/server/model/merchant';
import { expirePinPage } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/merchants'>;

// Adds listings to a pin's buy buttons (src/lib/shopping.ts): body
// { merchants: [{ label, url, price? }] }. A listing whose URL the pin already
// has is skipped, so a backfill can be run again. The whole-pin PUT would do it
// too, but rewrites every column and list, so a backfill across many pins goes
// through here, as product names do. Author or admin, as the PUT.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');

  const body = await readJson(request);
  if (!Array.isArray(body.merchants) || !body.merchants.length || body.merchants.length > 20) {
    throw new HttpError(400, 'merchants must be a list of 1 to 20 listings.');
  }
  const listings = (body.merchants as Record<string, unknown>[]).map((m) => {
    const label = typeof m?.label === 'string' ? m.label.trim() : '';
    const url = typeof m?.url === 'string' ? m.url.trim() : '';
    const price = m?.price == null ? null : Number(m.price);
    if (!label || label.length > 100 || !/^https:\/\//i.test(url) || url.length > 2000) {
      throw new HttpError(400, 'Each listing needs a label and an https url.');
    }
    if (price != null && !(Number.isFinite(price) && price > 0 && price < 1e10)) throw new HttpError(400, 'price must be a positive number.');
    return { label, url, price };
  });

  const have = new Set((await db.query<{ url: string }>(`SELECT "url" FROM "Merchant" WHERE "pinId" = $1`, [pinId])).map((r) => r.url));
  const fresh = listings.filter((m) => !have.has(m.url));
  const added = await Merchant.saveAll(
    fresh.map((m) => new Merchant(m)),
    pinId,
  );
  if (added.length) expirePinPage(pinId);
  return json({ pinId, added: added.map((m) => ({ id: m.id, label: m.label, url: m.url, price: m.price })), skipped: listings.length - fresh.length });
});
