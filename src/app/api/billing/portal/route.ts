import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, publicOrigin, route } from '@/server/http';
import AdFreeSubscription from '@/server/model/adFreeSubscription';
import { stripeConfigured, stripeRequest } from '@/server/stripe';

// Stripe's customer portal for the signed-in user's plan: cancel, change the
// card, see invoices.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!stripeConfigured()) throw new HttpError(503, 'Payments are not set up yet.');
  const customer = await AdFreeSubscription.customerId(user.id);
  if (!customer) throw new HttpError(404, 'There is no plan to manage.');
  const session = await stripeRequest<{ url: string }>('POST', '/billing_portal/sessions', {
    customer,
    return_url: `${publicOrigin(request)}/profile`,
  });
  return json({ url: session.url });
});
