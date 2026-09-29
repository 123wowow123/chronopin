import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { requireVerifiedEmail } from '@/server/emailVerification';
import { HttpError, json, readJson, route } from '@/server/http';
import Listing from '@/server/model/listing';
import { readListingInput } from '@/server/services/listings';
import { LISTING_KINDS, type ListingKind } from '@/lib/listings';

// The signed-in user's listings (sold ones too), with the ratings they have
// been given as a seller and as a buyer: the /listings page.
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const [listings, ratings] = await Promise.all([Listing.mine(user.id), Listing.received(user.id)]);
  return json({ listings, ratings });
});

// Create's Marketplace tab: a listing on its own, with no pin behind it, of
// the kind the seller picked (item, vehicle, home or job). Like a message,
// it needs a confirmed email.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  requireVerifiedEmail(user);
  const body = await readJson(request);
  if (!LISTING_KINDS.includes(body.kind)) throw new HttpError(422, '', { code: 'kind', message: `kind must be one of ${LISTING_KINDS.join(', ')}` });
  const kind = body.kind as ListingKind;
  const id = await Listing.create(null, user.id, kind, readListingInput(kind, body, user.id));
  return json({ listing: await Listing.get(id) }, 201);
});
