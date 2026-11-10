import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { deletePurpose, purposeForPin, savePurpose } from '@/server/model/pinPurpose';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/purpose'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

const strOrNull = (val: unknown, maxLen: number): string | null => (typeof val === 'string' && val.trim() ? val.trim().slice(0, maxLen) : null);

export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const p = await purposeForPin(intParam((await ctx.params).id));
  return p ? json(p) : noContent();
});

// PUT { problem, solution?, beneficiaries?, sourceUrl? } replaces the row.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const b = await readJson(request);
  const problem = strOrNull(b.problem, 600);
  if (!problem) throw new HttpError(400, 'problem is required.');
  const sourceUrl = strOrNull(b.sourceUrl, 4000);
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) throw new HttpError(400, 'sourceUrl is not a web address.');
  await savePurpose(pinId, { problem, solution: strOrNull(b.solution, 600), beneficiaries: strOrNull(b.beneficiaries, 300), sourceUrl });
  invalidatePin(pinId);
  return json(await purposeForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deletePurpose(pinId);
  invalidatePin(pinId);
  return noContent();
});
