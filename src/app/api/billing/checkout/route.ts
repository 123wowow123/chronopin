import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, publicOrigin, route } from '@/server/http';
import AdFreeSubscription from '@/server/model/adFreeSubscription';
import { AD_FREE_PRICE_CENTS, stripeConfigured, stripeRequest } from '@/server/stripe';

// Start the $1 a month ad-free plan: a Stripe Checkout session in subscription
// mode, answered with the page to send the signed-in user to. The price is
// inline, so there is no product to create in the dashboard first. The user id
// rides along twice (client_reference_id, and the subscription's metadata) so
// the webhook can tell whose plan it is.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!stripeConfigured()) throw new HttpError(503, 'Payments are not set up yet.');
  const current = await AdFreeSubscription.status(user.id);
  // A plan cancelled but paid through is still active: renew it in the portal, not with a second subscription.
  if (current.active) throw new HttpError(409, 'Ads are already off for this account.');

  const origin = publicOrigin(request);
  const customer = await AdFreeSubscription.customerId(user.id);
  const session = await stripeRequest<{ url: string }>('POST', '/checkout/sessions', {
    mode: 'subscription',
    client_reference_id: String(user.id),
    ...(customer ? { customer } : user.email ? { customer_email: user.email } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: AD_FREE_PRICE_CENTS,
          recurring: { interval: 'month' },
          product_data: { name: 'Chronopin ad-free', description: 'No ads on Chronopin while the plan is active.' },
        },
      },
    ],
    subscription_data: { metadata: { userId: String(user.id) } },
    success_url: `${origin}/profile?adfree=thanks`,
    cancel_url: `${origin}/profile`,
  });
  return json({ url: session.url });
});
