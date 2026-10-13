import config from '@/server/config';
import { HttpError, json, route } from '@/server/http';
import { fetchSubscription, recordSubscription } from '@/server/services/billing';
import { confirmAdPayment } from '@/server/services/sponsoredAds';
import { verifyStripeSignature } from '@/server/stripe';
import log from '@/server/util/log';

// Stripe's events for the ad-free plan. Point a webhook endpoint at
// /api/billing/webhook for checkout.session.completed and
// customer.subscription.created / updated / deleted, and put its signing
// secret in STRIPE_WEBHOOK_SECRET. The signature covers the raw body, so it is
// read as text before anything parses it. Whatever an event carries, the
// subscription is read again from Stripe, so a late or repeated event can only
// write what is true now. A failure answers 500 and Stripe sends it again.
type StripeEvent = { id: string; type: string; data: { object: Record<string, unknown> } };

export const POST = route(async (request: Request) => {
  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get('stripe-signature'), config.stripe.webhookSecret)) {
    throw new HttpError(400, 'Bad signature.');
  }
  const event = JSON.parse(raw) as StripeEvent;
  const object = event.data.object;

  if (event.type === 'checkout.session.completed' && object.mode === 'subscription' && object.subscription) {
    const userId = Number(object.client_reference_id);
    const subscription = await fetchSubscription(String(object.subscription));
    const known = await recordSubscription(subscription, Number.isInteger(userId) && userId > 0 ? userId : null);
    if (!known) log.warn(`[billing] checkout ${object.id} had no user`);
  } else if (event.type === 'checkout.session.completed' && object.mode === 'payment' && object.payment_status === 'paid') {
    await confirmAdPayment(object);
  } else if (event.type.startsWith('customer.subscription.') && object.id) {
    const subscription = await fetchSubscription(String(object.id));
    await recordSubscription(subscription);
  }
  return json({ received: true });
});
