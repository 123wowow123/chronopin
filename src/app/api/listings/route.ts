import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import Listing from '@/server/model/listing';

// The signed-in user's listings (sold ones too), with the ratings they have
// been given as a seller and as a buyer: the /listings page.
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const [listings, ratings] = await Promise.all([Listing.mine(user.id), Listing.received(user.id)]);
  return json({ listings, ratings });
});
