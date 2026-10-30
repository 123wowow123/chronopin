import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, publicOrigin, route } from '@/server/http';
import AdFreeSubscription from '@/server/model/adFreeSubscription';
import PremiumSubscription from '@/server/model/premiumSubscription';
import PrepaidPlan from '@/server/model/prepaidPlan';
import { startWechatCheckout } from '@/server/services/prepaidPlans';
import { CHECKOUT_PRICES, checkoutChoice, stripeConfigured, stripeRequest } from '@/server/stripe';

// Start the ad-free + premium bundle ($19 a month): one subscription that the
// webhook writes to both plans' tables. bundleUserId rides in the
// subscription's metadata so the webhook knows whose it is. A user who already
// has either plan cancels it first, so nobody pays twice for the same thing.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!stripeConfigured()) throw new HttpError(503, 'Payments are not set up yet.');
  const [adFree, premium] = await Promise.all([AdFreeSubscription.status(user.id), PremiumSubscription.status(user.id)]);
  const { currency, wechat } = await checkoutChoice(request);
  const origin = publicOrigin(request);
  // One month paid with WeChat Pay (no renewal): a bundle month may be added to a running bundle month.
  if (wechat) {
    const bundleEnd = await PrepaidPlan.paidThrough(user.id, ['bundle']);
    if ((adFree.active || premium.active) && !bundleEnd) throw new HttpError(409, 'This account already has the ad-free or premium plan.');
    return json({ url: await startWechatCheckout(user, 'bundle', origin, '/premium?paid=bundle') });
  }
  if (adFree.active || premium.active) throw new HttpError(409, 'This account already has the ad-free or premium plan.');
  const customer = (await PremiumSubscription.customerId(user.id)) ?? (await AdFreeSubscription.customerId(user.id));
  const session = await stripeRequest<{ url: string }>('POST', '/checkout/sessions', {
    mode: 'subscription',
    client_reference_id: String(user.id),
    ...(customer ? { customer } : user.email ? { customer_email: user.email } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: CHECKOUT_PRICES[currency].bundle,
          recurring: { interval: 'month' },
          product_data: { name: 'Chronopin ad-free + Premium', description: 'No ads, plus trader positions, estimated PnL and live trade alerts.' },
        },
      },
    ],
    subscription_data: { metadata: { bundleUserId: String(user.id) } },
    success_url: `${origin}/premium?paid=bundle`,
    cancel_url: `${origin}/premium`,
  });
  return json({ url: session.url });
});
