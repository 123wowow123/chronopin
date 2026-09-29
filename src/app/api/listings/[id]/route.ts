import type { NextRequest } from 'next/server';
import { getUser, requireUser } from '@/server/auth';
import { requireVerifiedEmail } from '@/server/emailVerification';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import Listing from '@/server/model/listing';
import { LISTING_STATUSES, type ListingStatus } from '@/lib/listings';
import { deleteListingMedia, readListingInput } from '@/server/services/listings';

type Ctx = RouteContext<'/api/listings/[id]'>;

// With the viewer's own `asked`: whether they already have a chat about it.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const [id, viewer] = await Promise.all([ctx.params.then((p) => intParam(p.id)), getUser(request)]);
  const listing = await Listing.get(id, viewer?.id ?? null);
  if (!listing) throw new HttpError(404, 'Not Found');
  return json({ listing });
});

// The seller's edit: the whole listing again, as the form sends it. Its kind
// stays the one it was listed as.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const id = intParam((await ctx.params).id);
  const user = await requireUser(request);
  requireVerifiedEmail(user);
  const listing = await Listing.get(id);
  if (!listing || listing.seller.id !== user.id) throw new HttpError(404, 'Not Found');
  const unused = await Listing.update(id, user.id, readListingInput(listing.kind, await readJson(request), user.id));
  if (!unused) throw new HttpError(404, 'Not Found');
  deleteListingMedia(unused);
  return json({ listing: await Listing.get(id) });
});

// { status }: available, pending (a buyer is lined up) or sold.
export const PATCH = route(async (request: NextRequest, ctx: Ctx) => {
  const id = intParam((await ctx.params).id);
  const user = await requireUser(request);
  const { status } = await readJson<{ status?: unknown }>(request);
  if (!LISTING_STATUSES.includes(status as ListingStatus)) throw new HttpError(400, '', { message: `status must be one of ${LISTING_STATUSES.join(', ')}` });
  if (!(await Listing.setStatus(id, user.id, status as ListingStatus))) throw new HttpError(404, 'Not Found');
  return json({ listing: await Listing.get(id) });
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const id = intParam((await ctx.params).id);
  const user = await requireUser(request);
  const media = await Listing.remove(id, user.id);
  if (!media) throw new HttpError(404, 'Not Found');
  deleteListingMedia(media);
  return noContent();
});
