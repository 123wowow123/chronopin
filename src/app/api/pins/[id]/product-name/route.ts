import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import { productNameOf } from '@/server/model/pinShared';
import { expirePinPage } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/product-name'>;

// Sets only the product a pin is about (0085), which its buy buttons search
// for (src/lib/shopping.ts): body { productName }, blank or null for none.
// The whole-pin PUT would do it too, but rewrites every column and list, so a
// backfill across many pins goes through here. Author or admin, as the PUT.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
  const body = await readJson(request);
  if (body.productName != null && typeof body.productName !== 'string') throw new HttpError(400, 'productName must be a string.');
  const productName = productNameOf(body);
  await db.query(`UPDATE "Pin" SET "productName" = $2, "utcUpdatedDateTime" = now() WHERE "id" = $1`, [pinId, productName]);
  expirePinPage(pinId);
  return json({ pinId, productName });
});
