import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, route } from '@/server/http';
import PinDuplicate from '@/server/model/pinDuplicate';
import { canDecideDuplicate } from '@/server/services/duplicatePin';

type Ctx = RouteContext<'/api/pins/[id]/duplicates'>;

// The duplicate pairs the signed-in user may decide for this pin: every pair
// for an admin, else the pairs where they wrote either pin. Suggestions are
// private to them; the confirmed group shows on the pin page for everyone.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) {
    throw new HttpError(404, 'Not Found');
  }
  const pairs = await PinDuplicate.listForPin(pinId);
  return json(pairs.filter((pair) => canDecideDuplicate(user, [pin.userId, pair.pin.userId])));
});
