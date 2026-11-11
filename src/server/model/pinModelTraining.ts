// An AI model pin's training metrics (PinModelTraining, 0260). One row per pin.

import * as db from '../db';
import type { PinModelTrainingJson, TrainingBasis } from '@/lib/modelTraining';

type Row = Omit<PinModelTrainingJson, 'checkedAt' | 'basis'> & { basis: TrainingBasis | null; checkedAt: Date };

export async function modelTrainingForPin(pinId: number): Promise<PinModelTrainingJson | null> {
  const [row] = await db.query<Row>(
    `SELECT "parametersBillions", "trainingComputeFlop", "trainingHardware", "trainingDays", "datasetSize", "datasetUnit",
            "basis", "sourceUrl", "note", "checkedAt" FROM "PinModelTraining" WHERE "pinId" = $1`,
    [pinId],
  );
  return row ? { ...row, checkedAt: new Date(row.checkedAt).toISOString() } : null;
}

export type ModelTrainingInput = Omit<PinModelTrainingJson, 'checkedAt'>;

// Replaces the whole row: a null is "unpublished", not "leave as is".
export async function saveModelTraining(pinId: number, input: ModelTrainingInput) {
  await db.query(
    `INSERT INTO "PinModelTraining" ("pinId", "parametersBillions", "trainingComputeFlop", "trainingHardware", "trainingDays",
       "datasetSize", "datasetUnit", "basis", "sourceUrl", "note", "checkedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT ("pinId") DO UPDATE SET "parametersBillions" = EXCLUDED."parametersBillions", "trainingComputeFlop" = EXCLUDED."trainingComputeFlop",
       "trainingHardware" = EXCLUDED."trainingHardware", "trainingDays" = EXCLUDED."trainingDays", "datasetSize" = EXCLUDED."datasetSize",
       "datasetUnit" = EXCLUDED."datasetUnit", "basis" = EXCLUDED."basis", "sourceUrl" = EXCLUDED."sourceUrl", "note" = EXCLUDED."note", "checkedAt" = now()`,
    [pinId, input.parametersBillions, input.trainingComputeFlop, input.trainingHardware, input.trainingDays, input.datasetSize, input.datasetUnit, input.basis, input.sourceUrl, input.note],
  );
}

export async function deleteModelTraining(pinId: number) {
  await db.query(`DELETE FROM "PinModelTraining" WHERE "pinId" = $1`, [pinId]);
}
