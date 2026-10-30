import config from '@/server/config';
import { HttpError, json, route } from '@/server/http';
import HeavyUserPlan from '@/server/model/heavyUserPlan';
import { fetchSubscription, recordBundleSubscription, recordHeavySubscription, recordPremiumSubscription, recordSubscription } from '@/server/services/billing';
import { adSubscriptionChanged, confirmAdPayment, confirmAdSubscription, renewAdSubscription } from '@/server/services/sponsoredAds';
import { verifyStripeSignature } from '@/server/stripe';
import log from '@/server/util/log';

// Stripe's events for the ad-free plan and for ads. Point a webhook endpoint at
// /api/billing/webhook for checkout.session.completed, checkout.session.async_payment_succeeded
// (OXXO and other delayed methods), invoice.paid (monthly
// ads renewing) and customer.subscription.created / updated / deleted, and put its signing
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

  // The heavy user plan (0191) marks its sessions and subscriptions with heavyUserId.
  const heavyMetadata = (object.metadata as Record<string, string> | null | undefined)?.heavyUserId;
  if (heavyMetadata) {
    const userId = Number(heavyMetadata);
    if (event.type === 'checkout.session.completed' && object.mode === 'subscription' && object.subscription) {
      const known = await recordHeavySubscription(await fetchSubscription(String(object.subscription)));
      if (!known) log.warn(`[billing] heavy checkout ${object.id} had no user`);
    } else if (
      (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') &&
      object.mode === 'payment' &&
      object.payment_status === 'paid' &&
      Number.isInteger(userId) && userId > 0
    ) {
      // $5 once: 30 days more, counted once per session.
      await HeavyUserPlan.addMonth(userId, typeof object.customer === 'string' ? object.customer : null, String(object.id));
    } else if (event.type.startsWith('customer.subscription.') && object.id) {
      await recordHeavySubscription(await fetchSubscription(String(object.id)));
    }
    return json({ received: true });
  }

  // The ad-free + premium bundle marks its sessions and subscriptions with bundleUserId.
  if ((object.metadata as Record<string, string> | null | undefined)?.bundleUserId) {
    if (event.type === 'checkout.session.completed' && object.mode === 'subscription' && object.subscription) {
      await recordBundleSubscription(await fetchSubscription(String(object.subscription)));
    } else if (event.type.startsWith('customer.subscription.') && object.id) {
      await recordBundleSubscription(await fetchSubscription(String(object.id)));
    }
    return json({ received: true });
  }

  // The $20 premium plan marks its sessions and subscriptions with premiumUserId.
  if ((object.metadata as Record<string, string> | null | undefined)?.premiumUserId) {
    if (event.type === 'checkout.session.completed' && object.mode === 'subscription' && object.subscription) {
      await recordPremiumSubscription(await fetchSubscription(String(object.subscription)));
    } else if (event.type.startsWith('customer.subscription.') && object.id) {
      await recordPremiumSubscription(await fetchSubscription(String(object.id)));
    }
    return json({ received: true });
  }

  const adMetadata = (object.metadata as Record<string, string> | null | undefined)?.sponsoredAdId;
  if (event.type === 'checkout.session.completed' && object.mode === 'subscription' && adMetadata) {
    // A monthly ad's subscription (src/server/services/sponsoredAds.ts).
    await confirmAdSubscription(object);
  } else if (event.type === 'invoice.paid') {
    await renewAdSubscription(object);
  } else if (event.type.startsWith('customer.subscription.') && adMetadata) {
    if (event.type !== 'customer.subscription.created') await adSubscriptionChanged(object);
  } else if (event.type === 'checkout.session.completed' && object.mode === 'subscription' && object.subscription) {
    const userId = Number(object.client_reference_id);
    const subscription = await fetchSubscription(String(object.subscription));
    const known = await recordSubscription(subscription, Number.isInteger(userId) && userId > 0 ? userId : null);
    if (!known) log.warn(`[billing] checkout ${object.id} had no user`);
  } else if (
    (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') &&
    object.mode === 'payment' &&
    object.payment_status === 'paid'
  ) {
    // Cards are paid at completion; OXXO vouchers and delayed wallets complete
    // unpaid and settle later, with async_payment_succeeded. Safe to see twice.
    await confirmAdPayment(object);
  } else if (event.type.startsWith('customer.subscription.') && object.id) {
    const subscription = await fetchSubscription(String(object.id));
    await recordSubscription(subscription);
  }
  return json({ received: true });
});
