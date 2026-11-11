import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { TRAINING_BASES, type TrainingBasis } from '@/lib/modelTraining';
import { deleteModelTraining, modelTrainingForPin, saveModelTraining } from '@/server/model/pinModelTraining';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/model-training'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

const posOrNull = (val: unknown, name: string): number | null => {
  if (val == null || val === '') return null;
  const n = Number(val);
  if (!(n > 0) || !Number.isFinite(n)) throw new HttpError(400, `${name} must be a positive number or null (unpublished).`);
  return n;
};
const strOrNull = (val: unknown, max: number): string | null => (typeof val === 'string' && val.trim() ? val.trim().slice(0, max) : null);

export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const row = await modelTrainingForPin(intParam((await ctx.params).id));
  return row ? json(row) : noContent();
});

// Replaces the row; send null for every figure the sources do not publish.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const body = await readJson(request);
  const basis = body.basis == null || body.basis === '' ? null : (body.basis as TrainingBasis);
  if (basis && !TRAINING_BASES.includes(basis)) throw new HttpError(400, `basis must be one of ${TRAINING_BASES.join(', ')}.`);
  const sourceUrl = strOrNull(body.sourceUrl, 4000);
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) throw new HttpError(400, 'sourceUrl is not a web address.');
  const hardwarePinId = body.hardwarePinId == null || body.hardwarePinId === '' ? null : Number(body.hardwarePinId);
  if (hardwarePinId != null) {
    if (!Number.isInteger(hardwarePinId) || hardwarePinId < 1) throw new HttpError(400, 'hardwarePinId must be a pin id or null.');
    const [hw] = await db.query(`SELECT 1 FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [hardwarePinId]);
    if (!hw) throw new HttpError(400, 'hardwarePinId is not a live pin.');
  }
  const input = {
    hardwarePinId,
    parametersBillions: posOrNull(body.parametersBillions, 'parametersBillions'),
    trainingComputeFlop: posOrNull(body.trainingComputeFlop, 'trainingComputeFlop'),
    trainingHardware: strOrNull(body.trainingHardware, 200),
    trainingDays: posOrNull(body.trainingDays, 'trainingDays'),
    datasetSize: posOrNull(body.datasetSize, 'datasetSize'),
    datasetUnit: strOrNull(body.datasetUnit, 24),
    basis,
    sourceUrl,
    note: strOrNull(body.note, 500),
  };
  if (input.datasetSize != null && !input.datasetUnit) throw new HttpError(400, 'datasetUnit is required with datasetSize (tokens, words, images).');
  await saveModelTraining(pinId, input);
  invalidatePin(pinId);
  return json(await modelTrainingForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteModelTraining(pinId);
  invalidatePin(pinId);
  return noContent();
});
