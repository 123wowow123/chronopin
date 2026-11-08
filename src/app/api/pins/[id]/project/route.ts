import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { PROJECT_BASES, type ProjectBasis } from '@/lib/projectSpecs';
import { deleteProject, projectForPin, saveProject } from '@/server/model/pinProject';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/project'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

const posOrNull = (val: unknown, name: string, max: number): number | null => {
  if (val == null || val === '') return null;
  const x = Number(val);
  if (!(x > 0) || x >= max) throw new HttpError(400, `${name} must be a positive number.`);
  return x;
};
const strOrNull = (val: unknown, maxLen: number): string | null => (typeof val === 'string' && val.trim() ? val.trim().slice(0, maxLen) : null);

export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const p = await projectForPin(intParam((await ctx.params).id));
  return p ? json(p) : noContent();
});

// PUT { units?, affordableUnits?, rooms?, seats?, beds?, stories?, sqft?, acres?, parking?, basis?, sourceUrl?, note? }
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const b = await readJson(request);
  const input = {
    units: posOrNull(b.units, 'units', 1e7), affordableUnits: posOrNull(b.affordableUnits, 'affordableUnits', 1e7),
    rooms: posOrNull(b.rooms, 'rooms', 1e6), seats: posOrNull(b.seats, 'seats', 1e7), beds: posOrNull(b.beds, 'beds', 1e6),
    stories: posOrNull(b.stories, 'stories', 1000), sqft: posOrNull(b.sqft, 'sqft', 1e12), acres: posOrNull(b.acres, 'acres', 1e9),
    parking: posOrNull(b.parking, 'parking', 1e7), basis: null as ProjectBasis | null,
    sourceUrl: strOrNull(b.sourceUrl, 4000), note: strOrNull(b.note, 500),
  };
  if (b.basis != null && b.basis !== '') {
    if (!PROJECT_BASES.includes(b.basis as ProjectBasis)) throw new HttpError(400, `basis must be one of ${PROJECT_BASES.join(', ')}.`);
    input.basis = b.basis as ProjectBasis;
  }
  if (input.affordableUnits != null && input.units != null && input.affordableUnits > input.units) throw new HttpError(400, 'affordableUnits cannot exceed units.');
  if (input.sourceUrl && !/^https?:\/\/\S+$/i.test(input.sourceUrl)) throw new HttpError(400, 'sourceUrl is not a web address.');
  if (Object.entries(input).every(([k, v]) => v == null || ['basis', 'sourceUrl', 'note'].includes(k))) throw new HttpError(400, 'Give at least one quantity.');
  await saveProject(pinId, input, 'hand');
  invalidatePin(pinId);
  return json(await projectForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteProject(pinId);
  invalidatePin(pinId);
  return noContent();
});
