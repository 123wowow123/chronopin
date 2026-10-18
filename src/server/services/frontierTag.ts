// Tags a model's pin "Frontier Model" when the model was on its year's cost/
// quality frontier at the time the pin was made (src/lib/modelChart.ts). It
// runs once, after a pin is created: a model that later falls behind keeps the
// tag, which says it led when it shipped, and nothing re-tags it.

import { FRONTIER_TAG } from '@/lib/modelChart';
import * as db from '../db';
import PinTag from '../model/pinTag';
import { frontierModelsOf } from '../modelChart';

// True when the tag was added.
export async function tagIfFrontier(pinId: number): Promise<boolean> {
  const [pin] = await db.query<{ title: string; aiModels: boolean }>(
    `SELECT "p"."title",
       EXISTS (SELECT 1 FROM "PinTag" "t" WHERE "t"."pinId" = "p"."id" AND "t"."name"::text IN ('AI Models', 'AI')) AS "aiModels"
     FROM "Pin" "p" WHERE "p"."id" = $1 AND "p"."utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  if (!pin?.aiModels) return false;
  if (!(await frontierModelsOf({ id: pinId, title: pin.title })).length) return false;
  return PinTag.addUserTags(pinId, [FRONTIER_TAG]);
}
