import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, publicOrigin, route } from '@/server/http';
import AdFreeSubscription from '@/server/model/adFreeSubscription';
import PrepaidPlan from '@/server/model/prepaidPlan';
import { startWechatCheckout } from '@/server/services/prepaidPlans';
import { CHECKOUT_PRICES, checkoutChoice, stripeConfigured, stripeRequest } from '@/server/stripe';

// Start the $1 a month ad-free plan: a Stripe Checkout session in subscription
// mode, answered with the page to send the signed-in user to. The price is
// inline, so there is no product to create in the dashboard first. The user id
// rides along twice (client_reference_id, and the subscription's metadata) so
// the webhook can tell whose plan it is.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!stripeConfigured()) throw new HttpError(503, 'Payments are not set up yet.');
  const current = await AdFreeSubscription.status(user.id);
  const { currency, wechat } = await checkoutChoice(request);
  const origin = publicOrigin(request);
  // One month paid with WeChat Pay (no renewal): another month may be bought while one is running.
  if (wechat) {
    if (current.active && !(await PrepaidPlan.paidThrough(user.id, ['adfree', 'bundle']))) throw new HttpError(409, 'Ads are already off for this account.');
    return json({ url: await startWechatCheckout(user, 'adfree', origin, '/profile?adfree=thanks') });
  }
  // A plan cancelled but paid through is still active: renew it in the portal, not with a second subscription.
  if (current.active) throw new HttpError(409, 'Ads are already off for this account.');

  const customer = await AdFreeSubscription.customerId(user.id);
  const session = await stripeRequest<{ url: string }>('POST', '/checkout/sessions', {
    mode: 'subscription',
    client_reference_id: String(user.id),
    ...(customer ? { customer } : user.email ? { customer_email: user.email } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: CHECKOUT_PRICES[currency].adFree,
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
