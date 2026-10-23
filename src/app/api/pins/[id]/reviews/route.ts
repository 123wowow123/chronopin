import type { NextRequest } from 'next/server';
import { getUser, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { requireVerifiedEmail } from '@/server/emailVerification';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import PinReview from '@/server/model/pinReview';
import { problemWithComment, validStars } from '@/lib/userReviews';

type Ctx = RouteContext<'/api/pins/[id]/reviews'>;

// The pin's reader reviews and their average. Public; a signed-in reader's own
// review is marked `mine` and leads.
// GET /api/pins/:id/reviews
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const user = await getUser(request);
  const [reviews, summary] = await Promise.all([PinReview.forPin(pinId, user?.id ?? 0), PinReview.summary(pinId)]);
  return json({ summary, reviews });
});

// Rates the pin ({ stars: 1-5, comment? }); a second call replaces the reader's
// review. Needs a signed-up user with a confirmed email address.
// PUT /api/pins/:id/reviews
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  requireVerifiedEmail(user);
  const pinId = intParam((await ctx.params).id);
  const { stars, comment } = await readJson(request);
  if (!validStars(stars)) throw new HttpError(400, 'stars must be a whole number from 1 to 5');
  const problem = problemWithComment(comment);
  if (problem) throw new HttpError(400, problem);
  const [pin] = await db.query(`SELECT "id" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  const review = await PinReview.save(pinId, user.id, stars, typeof comment === 'string' ? comment : null);
  return json({ review, summary: await PinReview.summary(pinId) });
});

// Takes back the signed-in reader's review.
// DELETE /api/pins/:id/reviews
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = intParam((await ctx.params).id);
  if (!(await PinReview.remove(pinId, user.id))) throw new HttpError(404, 'Not Found');
  return noContent();
});
