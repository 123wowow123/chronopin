import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, publicOrigin, route } from '@/server/http';
import HeavyUserPlan, { HEAVY_MONTH_CENTS, HEAVY_SUBSCRIPTION_CENTS } from '@/server/model/heavyUserPlan';
import { cnyFen, stripeConfigured, stripeRequest } from '@/server/stripe';

// Buy the heavy user plan (the page people reach when the request limit stops
// them, src/app/[lang]/heavy-use): { plan: 'month' } is $5 once for 30 days,
// { plan: 'subscription' } is $4 a month. Answers with Stripe Checkout's page.
// The user id rides in the metadata (heavyUserId) so the webhook knows whose
// plan it is.
const cnyIf = (cny: boolean, cents: number) => (cny ? cnyFen(cents) : cents);

export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!stripeConfigured()) throw new HttpError(503, 'Payments are not set up yet.');
  const body = (await request.json().catch(() => null)) as { plan?: unknown; currency?: unknown; method?: unknown } | null;
  const plan = body?.plan;
  if (plan !== 'month' && plan !== 'subscription') throw new HttpError(400, 'Choose a plan.');
  const current = await HeavyUserPlan.status(user.id);
  // A running subscription is changed in the portal; a second one would bill twice.
  if (current.active && current.plan === 'subscription' && !current.cancelAtPeriodEnd) throw new HttpError(409, 'You are already subscribed.');

  // Yuan: the 30-day pass is paid once with WeChat Pay (no renewal, with a reminder email),
  // the monthly plan by card in yuan.
  const wechat = body?.method === 'wechat';
  const cny = wechat || body?.currency === 'cny';
  if (wechat && plan !== 'month') throw new HttpError(400, 'WeChat Pay buys the 30-day pass.');
  const origin = publicOrigin(request);
  const customer = await HeavyUserPlan.customerId(user.id);
  const metadata = { heavyUserId: String(user.id), heavyPlan: plan, ...(wechat ? { heavyMethod: 'wechat' } : {}) };
  const subscription = plan === 'subscription';
  const session = await stripeRequest<{ url: string }>('POST', '/checkout/sessions', {
    mode: subscription ? 'subscription' : 'payment',
    client_reference_id: String(user.id),
    ...(wechat ? { payment_method_types: ['wechat_pay'], payment_method_options: { wechat_pay: { client: 'web' } } } : {}),
    ...(customer ? { customer } : user.email ? { customer_email: user.email } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: cny ? 'cny' : 'usd',
          unit_amount: cnyIf(cny, subscription ? HEAVY_SUBSCRIPTION_CENTS : HEAVY_MONTH_CENTS),
          ...(subscription ? { recurring: { interval: 'month' } } : {}),
          product_data: {
            name: subscription ? 'Chronopin heavy user (monthly)' : 'Chronopin heavy user (30 days)',
            description: 'No ads and unlimited reading on Chronopin, with a light rate limit.',
          },
        },
      },
    ],
    metadata,
    ...(subscription ? { subscription_data: { metadata } } : wechat ? { payment_intent_data: { metadata } } : {}),
    success_url: `${origin}/heavy-use?paid=1`,
    cancel_url: `${origin}/heavy-use`,
  });
  return json({ url: session.url });
});
