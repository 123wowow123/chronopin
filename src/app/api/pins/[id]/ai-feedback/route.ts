import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import AiFeedback from '@/server/model/aiFeedback';

type Ctx = RouteContext<'/api/pins/[id]/ai-feedback'>;

// Records what someone says a pin is missing, for the AI to act on later.
// POST /api/pins/:id/ai-feedback {feedback, sourceUrl?}
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = intParam((await ctx.params).id);
  const body = await readJson(request);
  const problem = AiFeedback.problem(body.feedback, body.sourceUrl);
  if (problem) {
    throw new HttpError(400, problem);
  }
  const [pin] = await db.query(`SELECT "id" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) {
    throw new HttpError(404, 'Not Found');
  }
  const row = await AiFeedback.create({ pinId, userId: user.id, feedback: body.feedback, sourceUrl: body.sourceUrl });
  return json({ id: row.id, pinId, utcCreatedDateTime: row.utcCreatedDateTime }, 201);
});
