import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { WATER_BASES, type WaterBasis } from '@/lib/datacenter';
import { datacenterForPin, deleteDatacenter, saveDatacenter } from '@/server/model/pinDatacenter';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/datacenter'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

const posOrNull = (val: unknown, name: string, max = 1e12): number | null => {
  if (val == null || val === '') return null;
  const n = Number(val);
  if (!(n > 0) || n >= max) throw new HttpError(400, `${name} must be a positive number.`);
  return n;
};

const strOrNull = (val: unknown, maxLen: number): string | null =>
  typeof val === 'string' && val.trim() ? val.trim().slice(0, maxLen) : null;

export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const dc = await datacenterForPin(intParam((await ctx.params).id));
  return dc ? json(dc) : noContent();
});

export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const body = await readJson(request);
  const waterGallonsPerDay = posOrNull(body.waterGallonsPerDay, 'waterGallonsPerDay', 1e12);
  let waterBasis: WaterBasis | null = null;
  if (body.waterBasis != null && body.waterBasis !== '') {
    waterBasis = body.waterBasis as WaterBasis;
    if (!WATER_BASES.includes(waterBasis)) throw new HttpError(400, `waterBasis must be one of ${WATER_BASES.join(', ')}.`);
  } else if (waterGallonsPerDay != null) {
    waterBasis = 'published';
  }
  const chips = posOrNull(body.chips, 'chips', 1e12);
  const chipModel = strOrNull(body.chipModel, 120);
  const h100Equivalents = posOrNull(body.h100Equivalents, 'h100Equivalents', 1e12);
  const acres = posOrNull(body.acres, 'acres', 1e9);
  const sqft = posOrNull(body.sqft, 'sqft', 1e12);
  const buildings = posOrNull(body.buildings, 'buildings', 1e6);
  const generators = posOrNull(body.generators, 'generators', 1e6);
  const cooling = strOrNull(body.cooling, 120);
  const powerSource = strOrNull(body.powerSource, 200);
  const sourceUrl = strOrNull(body.sourceUrl, 4000);
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) throw new HttpError(400, 'sourceUrl is not a web address.');
  const note = strOrNull(body.note, 500);

  await saveDatacenter(pinId, {
    waterGallonsPerDay,
    waterBasis,
    chips,
    chipModel,
    h100Equivalents,
    acres,
    sqft,
    buildings,
    generators,
    cooling,
    powerSource,
    sourceUrl,
    note,
  });
  invalidatePin(pinId);
  return json(await datacenterForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteDatacenter(pinId);
  invalidatePin(pinId);
  return noContent();
});

