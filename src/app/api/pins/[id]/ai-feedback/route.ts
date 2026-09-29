import { after, type NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import AiFeedback, { DAILY_LIMIT } from '@/server/model/aiFeedback';
import { reviewFeedback } from '@/server/services/suggestions';

type Ctx = RouteContext<'/api/pins/[id]/ai-feedback'>;

// The signed-in person's own suggestions on this pin, newest first, with what
// the AI's review made of each.
// GET /api/pins/:id/ai-feedback
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = intParam((await ctx.params).id);
  return json(await AiFeedback.forPinAndUser(pinId, user.id));
});

// Records what someone says a pin is missing or getting wrong - from the
// duplicate prompt or the pin's own page - and has the AI review it once the
// response is out (src/server/services/suggestions.ts).
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
  if (user.role !== 'admin' && (await AiFeedback.countToday(user.id)) >= DAILY_LIMIT) {
    throw new HttpError(429, `At most ${DAILY_LIMIT} suggestions a day.`);
  }
  const row = await AiFeedback.create({ pinId, userId: user.id, feedback: body.feedback, sourceUrl: body.sourceUrl });
  after(() => reviewFeedback(row.id));
  return json({ id: row.id, pinId, status: 'open', utcCreatedDateTime: row.utcCreatedDateTime }, 201);
});
