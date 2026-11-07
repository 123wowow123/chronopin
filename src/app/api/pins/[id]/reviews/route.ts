import type { NextRequest } from 'next/server';
import { getUser, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { requireVerifiedEmail } from '@/server/emailVerification';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { restaurantMenuProfileFor } from '@/server/services/restaurantContent';
import { saveReviewWithPhotos } from '@/server/services/reviewPhotos';
import PinReview from '@/server/model/pinReview';
import { problemWithComment, validStars } from '@/lib/userReviews';

function menuItemParam(request: NextRequest) {
  const item = request.nextUrl.searchParams.get('item');
  if (item !== null && (!item.trim() || item.length > 500)) throw new HttpError(400, 'Invalid menu item');
  return item?.trim() ?? '';
}

type Ctx = RouteContext<'/api/pins/[id]/reviews'>;

// The pin's reader reviews and their average. Public; a signed-in reader's own
// review is marked `mine` and leads.
// Optional ?item=<exact menu item name> scopes all operations to that dish.
// GET /api/pins/:id/reviews
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const menuItem = menuItemParam(request);
  const user = await getUser(request);
  const [reviews, summary] = await Promise.all([PinReview.forPin(pinId, user?.id ?? 0, menuItem), PinReview.summary(pinId, menuItem)]);
  return json({ summary, reviews });
});

// Rates the pin ({ stars: 1-5, comment? }); a second call replaces the reader's
// review. Needs a signed-up user with a confirmed email address.
// PUT /api/pins/:id/reviews
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  requireVerifiedEmail(user);
  const pinId = intParam((await ctx.params).id);
  const menuItem = menuItemParam(request);
  const multipart = request.headers.get('content-type')?.startsWith('multipart/form-data');
  const form = multipart ? await request.formData().catch(() => null) : null;
  if (multipart && !form) throw new HttpError(400, 'Invalid photo upload');
  const body = form ? { stars: Number(form.get('stars')), comment: form.get('comment') } : await readJson(request);
  const { stars, comment } = body;
  const uploads = form?.getAll('photos') ?? [];
  if (uploads.some((file) => !(file instanceof File))) throw new HttpError(400, 'Choose a photo');
  let removed: unknown = body.removePhotoIds ?? [];
  if (form?.has('removePhotoIds')) {
    try { removed = JSON.parse(String(form.get('removePhotoIds'))); } catch { throw new HttpError(400, 'Invalid photo removal'); }
  }
  if (!Array.isArray(removed) || removed.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(removed).size !== removed.length) throw new HttpError(400, 'Invalid photo removal');
  if (!validStars(stars)) throw new HttpError(400, 'stars must be a whole number from 1 to 5');
  const problem = problemWithComment(comment);
  if (problem) throw new HttpError(400, problem);
  const [pin] = await db.query(`SELECT "id", "sourceUrl" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (menuItem) {
    const profile = await restaurantMenuProfileFor(pin.sourceUrl);
    if (!profile?.menus.some((menu) => menu.items.some((item) => item.name.trim() === menuItem))) {
      throw new HttpError(400, 'Item is not on this restaurant’s menu');
    }
  }
  const review = uploads.length || removed.length
    ? await saveReviewWithPhotos({ pinId, userId: user.id, isAdmin: user.role === 'admin', stars, comment: typeof comment === 'string' ? comment : null, menuItem, files: uploads as File[], removePhotoIds: removed })
    : await PinReview.save(pinId, user.id, stars, typeof comment === 'string' ? comment : null, menuItem);
  return json({ review, summary: await PinReview.summary(pinId, menuItem) });
});

// Takes back the signed-in reader's review.
// DELETE /api/pins/:id/reviews
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = intParam((await ctx.params).id);
  const menuItem = menuItemParam(request);
  if (!(await PinReview.remove(pinId, user.id, menuItem))) throw new HttpError(404, 'Not Found');
  return noContent();
});
