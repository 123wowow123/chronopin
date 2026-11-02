import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Pins from '@/server/model/pins';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/subthread'>;

// Only the pin's author and admins read or set its subthread flag.
async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null; parentId: number | null; subthread: boolean }>(
    `SELECT "userId", "parentId", "subthread" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
  return pin;
}

// { subthread, hasParent }: whether the pin is marked a subthread, and whether
// it answers another pin (only a reply can be one).
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const pin = await authorOrAdmin(request, intParam((await ctx.params).id));
  return json({ subthread: pin.subthread, hasParent: pin.parentId != null });
});

// Marks or unmarks the pin a subthread: body { subthread: boolean }. A side
// note steps in under the pin it answers in the Thread pane, even as that
// pin's only response (src/lib/thread.ts). The flag is not part of the
// whole-pin PUT, so an edit never resets it.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const pin = await authorOrAdmin(request, pinId);
  const { subthread } = await readJson(request);
  if (typeof subthread !== 'boolean') throw new HttpError(400, 'subthread must be true or false');
  if (subthread && pin.parentId == null) throw new HttpError(400, 'Only a reply to another pin can be a subthread.');
  await db.query(`UPDATE "Pin" SET "subthread" = $2 WHERE "id" = $1`, [pinId, subthread]);
  // Every page that lists the thread shows the new nesting. Not in after():
  // revalidateTag is refused there, and invalidatePin would swallow that.
  for (const id of await Pins.threadIds(pinId)) invalidatePin(id);
  return json({ subthread });
});
