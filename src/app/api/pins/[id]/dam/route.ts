import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { DAM_BASES, DAM_SCOPES, DAM_TYPES, type DamBasis, type DamScope, type DamType } from '@/lib/damSpecs';
import { deleteDam, damForPin, saveDam, type SaveDamInput } from '@/server/model/pinDam';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/dam'>;

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
const oneOf = <T extends string>(val: unknown, name: string, allowed: readonly T[]): T | null => {
  if (val == null || val === '') return null;
  if (!allowed.includes(val as T)) throw new HttpError(400, `${name} must be one of ${allowed.join(', ')}.`);
  return val as T;
};

export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const p = await damForPin(intParam((await ctx.params).id));
  return p ? json(p) : noContent();
});

// PUT { heightFt?, crestLengthFt?, storageAcreFt?, addedStorageAcreFt?, capacityMw?, damType?, river?, owner?, state?, scope?, basis?, sourceUrl?, note? }
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const b = await readJson(request);
  const state = strOrNull(b.state, 2)?.toUpperCase() ?? null;
  if (state && !/^[A-Z]{2}$/.test(state)) throw new HttpError(400, 'state must be a two-letter US state code.');
  const input: SaveDamInput = {
    heightFt: posOrNull(b.heightFt, 'heightFt', 5000), crestLengthFt: posOrNull(b.crestLengthFt, 'crestLengthFt', 1e6),
    storageAcreFt: posOrNull(b.storageAcreFt, 'storageAcreFt', 1e10), addedStorageAcreFt: posOrNull(b.addedStorageAcreFt, 'addedStorageAcreFt', 1e10),
    capacityMw: posOrNull(b.capacityMw, 'capacityMw', 1e6),
    damType: oneOf<DamType>(b.damType, 'damType', DAM_TYPES), scope: oneOf<DamScope>(b.scope, 'scope', DAM_SCOPES), basis: oneOf<DamBasis>(b.basis, 'basis', DAM_BASES),
    river: strOrNull(b.river, 120), owner: strOrNull(b.owner, 160), state, sourceUrl: strOrNull(b.sourceUrl, 4000), note: strOrNull(b.note, 500),
  };
  if (input.sourceUrl && !/^https?:\/\/\S+$/i.test(input.sourceUrl)) throw new HttpError(400, 'sourceUrl is not a web address.');
  const figures = [input.heightFt, input.crestLengthFt, input.storageAcreFt, input.addedStorageAcreFt, input.capacityMw, input.damType, input.scope];
  if (figures.every((v) => v == null)) throw new HttpError(400, 'Give at least one figure, a dam type or a scope.');
  await saveDam(pinId, input);
  invalidatePin(pinId);
  return json(await damForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteDam(pinId);
  invalidatePin(pinId);
  return noContent();
});
