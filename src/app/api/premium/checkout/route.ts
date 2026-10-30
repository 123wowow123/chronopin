import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, publicOrigin, route } from '@/server/http';
import PremiumSubscription from '@/server/model/premiumSubscription';
import PrepaidPlan from '@/server/model/prepaidPlan';
import { startWechatCheckout } from '@/server/services/prepaidPlans';
import { CHECKOUT_PRICES, checkoutChoice, stripeConfigured, stripeRequest } from '@/server/stripe';

// Start the $20 a month premium plan: a Stripe Checkout session, as the
// ad-free plan's. premiumUserId rides in the subscription's metadata so the
// webhook knows whose it is.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!stripeConfigured()) throw new HttpError(503, 'Payments are not set up yet.');
  const active = (await PremiumSubscription.status(user.id)).active;
  const { currency, wechat } = await checkoutChoice(request);
  const origin = publicOrigin(request);
  // One month paid with WeChat Pay (no renewal): another month may be bought while one is running.
  if (wechat) {
    if (active && !(await PrepaidPlan.paidThrough(user.id, ['premium', 'bundle']))) throw new HttpError(409, 'Premium is already on for this account.');
    return json({ url: await startWechatCheckout(user, 'premium', origin, '/premium?paid=1') });
  }
  if (active) throw new HttpError(409, 'Premium is already on for this account.');
  const customer = await PremiumSubscription.customerId(user.id);
  const session = await stripeRequest<{ url: string }>('POST', '/checkout/sessions', {
    mode: 'subscription',
    client_reference_id: String(user.id),
    ...(customer ? { customer } : user.email ? { customer_email: user.email } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: CHECKOUT_PRICES[currency].premium,
          recurring: { interval: 'month' },
          product_data: { name: 'Chronopin Premium', description: 'Trader positions, estimated PnL and live trade alerts.' },
        },
      },
    ],
    subscription_data: { metadata: { premiumUserId: String(user.id) } },
    success_url: `${origin}/premium?paid=1`,
    cancel_url: `${origin}/premium`,
  });
  return json({ url: session.url });
});
