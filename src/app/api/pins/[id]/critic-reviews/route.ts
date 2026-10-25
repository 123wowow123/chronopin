import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { criticReviewsForPin, criticReviewsProblem, deleteCriticReviews, saveCriticReviews } from '@/server/model/pinCriticReview';
import { expirePinPage } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/critic-reviews'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

// The pin's independent critic reviews (src/lib/pinCriticReviews.ts), or 204 when it has none.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const reviews = await criticReviewsForPin(intParam((await ctx.params).id));
  return reviews ? json(reviews) : noContent();
});

// Stores the reviews: body { reviews ([{url, title, publishedDate, quote,
// sentiment}], 1 to 8, pages that review this product; a sentiment is -1..1
// and a url already stored keeps its score), source ('session' | 'hand'),
// basis, sourceUrl }. Replaces the pin's reviews.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const checked = criticReviewsProblem(await readJson(request));
  if (typeof checked === 'string') throw new HttpError(400, checked);
  if (!(await saveCriticReviews(pinId, checked))) throw new HttpError(409, 'This pin has reviews set by hand; send source "hand" to replace them.');
  expirePinPage(pinId);
  return json(await criticReviewsForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteCriticReviews(pinId);
  expirePinPage(pinId);
  return noContent();
});
