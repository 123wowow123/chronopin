import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { ENERGY_BASES, type EnergyBasis } from '@/lib/energy';
import { deleteEnergy, energyForPin, saveEnergy } from '@/server/model/pinEnergy';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/energy'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

// The pin's annual electricity use, or 204 when none is recorded.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const energy = await energyForPin(intParam((await ctx.params).id));
  return energy ? json(energy) : noContent();
});

// body { gwh, basis?, sourceUrl?, note? }: annual use in GWh (1 TWh = 1000).
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const body = await readJson(request);
  const gwh = Number(body.gwh);
  if (!(gwh > 0) || gwh >= 100_000_000) throw new HttpError(400, 'gwh must be a positive number of gigawatt-hours a year (1 TWh = 1000).');
  const basis = (body.basis ?? 'published') as EnergyBasis;
  if (!ENERGY_BASES.includes(basis)) throw new HttpError(400, `basis must be one of ${ENERGY_BASES.join(', ')}.`);
  const sourceUrl = typeof body.sourceUrl === 'string' && body.sourceUrl.trim() ? body.sourceUrl.trim() : null;
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) throw new HttpError(400, 'sourceUrl is not a web address.');
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : null;
  await saveEnergy(pinId, gwh, { basis, sourceUrl, note });
  invalidatePin(pinId);
  return json(await energyForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteEnergy(pinId);
  invalidatePin(pinId);
  return noContent();
});
