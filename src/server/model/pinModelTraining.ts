// An AI model pin's training metrics (PinModelTraining, 0260). One row per pin.

import * as db from '../db';
import type { PinModelTrainingJson, TrainingBasis } from '@/lib/modelTraining';

type Row = Omit<PinModelTrainingJson, 'checkedAt' | 'basis' | 'hardwarePin'> & { basis: TrainingBasis | null; checkedAt: Date; hardwarePinId: number | null; hardwareTitle: string | null };

export async function modelTrainingForPin(pinId: number): Promise<PinModelTrainingJson | null> {
  const [row] = await db.query<Row>(
    `SELECT t."parametersBillions", t."trainingComputeFlop", t."trainingHardware", t."trainingDays", t."datasetSize", t."datasetUnit",
            t."basis", t."sourceUrl", t."note", t."checkedAt", t."hardwarePinId", h."title" AS "hardwareTitle"
     FROM "PinModelTraining" t LEFT JOIN "Pin" h ON h."id" = t."hardwarePinId" AND h."utcDeletedDateTime" IS NULL
     WHERE t."pinId" = $1`,
    [pinId],
  );
  if (!row) return null;
  const { hardwarePinId, hardwareTitle, checkedAt, ...rest } = row;
  return { ...rest, hardwarePin: hardwarePinId && hardwareTitle ? { id: hardwarePinId, title: hardwareTitle } : null, checkedAt: new Date(checkedAt).toISOString() };
}

export type ModelTrainingInput = Omit<PinModelTrainingJson, 'checkedAt' | 'hardwarePin'> & { hardwarePinId?: number | null };

// Replaces the whole row: a null is "unpublished", not "leave as is".
export async function saveModelTraining(pinId: number, input: ModelTrainingInput) {
  await db.query(
    `INSERT INTO "PinModelTraining" ("pinId", "parametersBillions", "trainingComputeFlop", "trainingHardware", "trainingDays",
       "datasetSize", "datasetUnit", "basis", "sourceUrl", "note", "hardwarePinId", "checkedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
     ON CONFLICT ("pinId") DO UPDATE SET "parametersBillions" = EXCLUDED."parametersBillions", "trainingComputeFlop" = EXCLUDED."trainingComputeFlop",
       "trainingHardware" = EXCLUDED."trainingHardware", "trainingDays" = EXCLUDED."trainingDays", "datasetSize" = EXCLUDED."datasetSize",
       "datasetUnit" = EXCLUDED."datasetUnit", "basis" = EXCLUDED."basis", "sourceUrl" = EXCLUDED."sourceUrl", "note" = EXCLUDED."note", "hardwarePinId" = EXCLUDED."hardwarePinId", "checkedAt" = now()`,
    [pinId, input.parametersBillions, input.trainingComputeFlop, input.trainingHardware, input.trainingDays, input.datasetSize, input.datasetUnit, input.basis, input.sourceUrl, input.note, input.hardwarePinId ?? null],
  );
}

export async function deleteModelTraining(pinId: number) {
  await db.query(`DELETE FROM "PinModelTraining" WHERE "pinId" = $1`, [pinId]);
}
