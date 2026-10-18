import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Listing from '@/server/model/listing';
import UserBlock from '@/server/model/userBlock';
import { RATING_TURNS, ratingProblem, type RatingRole } from '@/lib/listings';

type Ctx = RouteContext<'/api/listings/[id]/ratings'>;

// Rates the other side of a chat about the listing: { userId, stars, tags?,
// body? }. The buyer rates the seller, the seller a buyer, once the chat has
// run RATING_TURNS turns; a second rating replaces the first.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const listingId = intParam((await ctx.params).id);
  const user = await requireUser(request);
  const body = await readJson<{ userId?: unknown; stars?: unknown; tags?: unknown; body?: unknown }>(request);
  const rateeId = Number(body.userId);
  if (!Number.isInteger(rateeId) || rateeId <= 0 || rateeId === user.id) throw new HttpError(400, '', { message: 'userId must be the other side of the chat' });
  const sellerId = await Listing.sellerOf(listingId);
  if (!sellerId) throw new HttpError(404, 'Not Found');
  const role: RatingRole = sellerId === user.id ? 'buyer' : 'seller';
  const problem = ratingProblem(role, body);
  if (problem) throw new HttpError(422, '', { message: problem });
  if (await UserBlock.between(user.id, rateeId)) throw new HttpError(403, '', { code: 'blocked', message: 'you cannot rate this person' });
  const rating = await Listing.rate(listingId, user.id, rateeId, {
    stars: body.stars as number,
    tags: [...new Set((body.tags as string[] | undefined) ?? [])],
    body: typeof body.body === 'string' ? body.body.trim() : '',
  });
  if (!rating) throw new HttpError(403, '', { code: 'tooSoon', message: `a rating opens once your chat about this listing has run ${RATING_TURNS} turns` });
  return json({ rating }, 201);
});
