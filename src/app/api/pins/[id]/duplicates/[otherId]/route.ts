import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import PinDuplicate from '@/server/model/pinDuplicate';
import { invalidatePin } from '@/server/services/cache';
import { canDecideDuplicate } from '@/server/services/duplicatePin';
import { feedNewerDuplicate } from '@/server/services/duplicateFeed';

type Ctx = RouteContext<'/api/pins/[id]/duplicates/[otherId]'>;

// Confirms a suggested (or earlier rejected) pair as the same event, or rejects
// it - which also unlinks a confirmed pair. Body: { status: 'confirmed' | 'rejected' }.
// A confirmed pair's newer pin updates the older one (services/duplicateFeed.ts).
// Only pairs the app suggested can be decided, by an admin or either pin's author.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const params = await ctx.params;
  const pinId = intParam(params.id);
  const otherPinId = intParam(params.otherId);
  const user = await requireUser(request);

  const { status } = await readJson<{ status?: string }>(request);
  if (status !== 'confirmed' && status !== 'rejected') {
    throw new HttpError(400, "status must be 'confirmed' or 'rejected'");
  }

  const pins = await db.query<{ id: number; userId: number | null }>(
    `SELECT "id", "userId" FROM "Pin" WHERE "id" = ANY($1::integer[]) AND "utcDeletedDateTime" IS NULL`,
    [[pinId, otherPinId]],
  );
  const pair = pinId !== otherPinId && pins.length === 2 ? await PinDuplicate.find(pinId, otherPinId) : undefined;
  if (!pair) {
    throw new HttpError(404, 'Not Found');
  }
  if (!canDecideDuplicate(user, pins.map((p) => p.userId))) {
    throw new HttpError(403, 'Forbidden');
  }

  // Every pin whose group changes: the groups either side of the decision.
  const before = [...(await PinDuplicate.group(pinId)), ...(await PinDuplicate.group(otherPinId))];
  await PinDuplicate.decide(pinId, otherPinId, status, user.id);
  // The newer of the two, when it came later, brings its news to the older
  // one (confirming again feeds a pair confirmed before this existed).
  if (status === 'confirmed') await feedNewerDuplicate(pinId, otherPinId, user.id);
  const after = [...(await PinDuplicate.group(pinId)), ...(await PinDuplicate.group(otherPinId))];
  for (const id of new Set([...before, ...after])) {
    invalidatePin(id);
  }

  return json({ pinId, otherPinId, status });
});
