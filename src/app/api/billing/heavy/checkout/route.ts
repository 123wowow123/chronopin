import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, publicOrigin, route } from '@/server/http';
import HeavyUserPlan, { HEAVY_MONTH_CENTS, HEAVY_SUBSCRIPTION_CENTS } from '@/server/model/heavyUserPlan';
import { stripeConfigured, stripeRequest } from '@/server/stripe';

// Buy the heavy user plan (the page people reach when the request limit stops
// them, src/app/[lang]/heavy-use): { plan: 'month' } is $5 once for 30 days,
// { plan: 'subscription' } is $4 a month. Answers with Stripe Checkout's page.
// The user id rides in the metadata (heavyUserId) so the webhook knows whose
// plan it is.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!stripeConfigured()) throw new HttpError(503, 'Payments are not set up yet.');
  const body = (await request.json().catch(() => null)) as { plan?: unknown } | null;
  const plan = body?.plan;
  if (plan !== 'month' && plan !== 'subscription') throw new HttpError(400, 'Choose a plan.');
  const current = await HeavyUserPlan.status(user.id);
  // A running subscription is changed in the portal; a second one would bill twice.
  if (current.active && current.plan === 'subscription' && !current.cancelAtPeriodEnd) throw new HttpError(409, 'You are already subscribed.');

  const origin = publicOrigin(request);
  const customer = await HeavyUserPlan.customerId(user.id);
  const metadata = { heavyUserId: String(user.id), heavyPlan: plan };
  const subscription = plan === 'subscription';
  const session = await stripeRequest<{ url: string }>('POST', '/checkout/sessions', {
    mode: subscription ? 'subscription' : 'payment',
    client_reference_id: String(user.id),
    ...(customer ? { customer } : user.email ? { customer_email: user.email } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: subscription ? HEAVY_SUBSCRIPTION_CENTS : HEAVY_MONTH_CENTS,
          ...(subscription ? { recurring: { interval: 'month' } } : {}),
          product_data: {
            name: subscription ? 'Chronopin heavy user (monthly)' : 'Chronopin heavy user (30 days)',
            description: 'No ads and unlimited reading on Chronopin, with a light rate limit.',
          },
        },
      },
    ],
    metadata,
    ...(subscription ? { subscription_data: { metadata } } : {}),
    success_url: `${origin}/heavy-use?paid=1`,
    cancel_url: `${origin}/heavy-use`,
  });
  return json({ url: session.url });
});
