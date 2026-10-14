import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, publicOrigin, route } from '@/server/http';
import SponsoredAd from '@/server/model/sponsoredAd';
import { stripeConfigured, stripeRequest } from '@/server/stripe';

// Stripe's customer portal for a monthly ad: cancel, change the card, see
// invoices. Answers with the portal's address.
export const POST = route(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  if (!stripeConfigured()) throw new HttpError(503, 'Payments are not set up yet.');
  const customer = await SponsoredAd.customerIdOf(intParam((await params).id), user.id);
  if (!customer) throw new HttpError(404, 'There is no subscription to manage.');
  const session = await stripeRequest<{ url: string }>('POST', '/billing_portal/sessions', {
    customer,
    return_url: `${publicOrigin(request)}/profile/ads`,
  });
  return json({ url: session.url });
});
