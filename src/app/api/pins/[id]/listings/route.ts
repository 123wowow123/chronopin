import type { NextRequest } from 'next/server';
import { getUser, requireUser } from '@/server/auth';
import { requireVerifiedEmail } from '@/server/emailVerification';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Listing from '@/server/model/listing';
import { pinListingKind, readListingInput } from '@/server/services/listings';

type Ctx = RouteContext<'/api/pins/[id]/listings'>;

// The pin's marketplace listings still on offer, and the kind it sells as
// (null: it names no product, so nothing can be listed on it).
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const [kind, viewer] = await Promise.all([pinListingKind(pinId), getUser(request)]);
  return json({ kind, listings: kind ? await Listing.forPin(pinId, viewer?.id ?? null) : [] });
});

// "Sell this item here": lists the pin's product for sale, as the kind the
// pin sells as and no other. Like a message, it needs a confirmed email.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const user = await requireUser(request);
  requireVerifiedEmail(user);
  const kind = await pinListingKind(pinId);
  if (!kind) throw new HttpError(422, '', { code: 'notForSale', message: 'this pin names no product to sell' });
  const body = await readJson(request);
  if (body.kind != null && body.kind !== kind) throw new HttpError(422, '', { code: 'kind', message: `this pin takes ${kind} listings only` });
  const id = await Listing.create(pinId, user.id, kind, readListingInput(kind, body, user.id));
  return json({ listing: await Listing.get(id) }, 201);
});
