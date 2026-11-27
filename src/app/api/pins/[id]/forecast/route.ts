import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import * as db from '@/server/db';
import { deleteForecast, forecastForPin, saveForecast } from '@/server/model/pinForecast';
import { parseForecast } from '@/lib/pinForecast';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/forecast'>;

async function adminOnly(request: NextRequest, pinId: number) {
  await requireRole('admin', request);
  const [pin] = await db.query(`SELECT 1 FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
}

export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const forecast = await forecastForPin(intParam((await ctx.params).id));
  return forecast ? json(forecast) : noContent();
});

// Body: { outcome, reasoning, probability?: 0-100, marketProbability?: 0-100, evidence?: [{ pinId, note }] (max 6) }.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await adminOnly(request, pinId);
  let forecast;
  try {
    forecast = parseForecast(await readJson(request));
  } catch (err) {
    throw new HttpError(400, '', { message: (err as Error).message });
  }
  await saveForecast(pinId, forecast);
  invalidatePin(pinId);
  return json(await forecastForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await adminOnly(request, pinId);
  await deleteForecast(pinId);
  invalidatePin(pinId);
  return noContent();
});
