import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import * as db from '@/server/db';
import { deleteMarketImpact, marketImpactForPin, saveMarketImpact } from '@/server/model/pinMarketImpact';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/market-impact'>;

// Scoring is an editorial call, so admin only (the daily jobs sign in as admin).
async function adminOnly(request: NextRequest, pinId: number) {
  await requireRole('admin', request);
  const [pin] = await db.query(`SELECT 1 FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
}

export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const impact = await marketImpactForPin(intParam((await ctx.params).id));
  return impact ? json(impact) : noContent();
});

// Body: { weight: 1-10, reason: string (required, <= 500), assets?: string (<= 200) }.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await adminOnly(request, pinId);
  const body = await readJson(request);
  const weight = Number(body.weight);
  if (!Number.isInteger(weight) || weight < 1 || weight > 10) throw new HttpError(400, '', { message: 'weight must be an integer 1-10.' });
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason || reason.length > 500) throw new HttpError(400, '', { message: 'reason is required (at most 500 characters).' });
  const assets = typeof body.assets === 'string' && body.assets.trim() ? body.assets.trim().slice(0, 200) : null;
  await saveMarketImpact(pinId, { weight, reason, assets });
  invalidatePin(pinId);
  return json(await marketImpactForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await adminOnly(request, pinId);
  await deleteMarketImpact(pinId);
  invalidatePin(pinId);
  return noContent();
});
