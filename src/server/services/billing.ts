// The ad-free plan's side of Stripe: what a subscription says, written into
// AdFreeSubscription. Shared by the webhook and by the checkout return.

import AdFreeSubscription from '../model/adFreeSubscription';
import HeavyUserPlan from '../model/heavyUserPlan';
import PremiumSubscription from '../model/premiumSubscription';
import { stripeRequest } from '../stripe';

type StripeSubscription = {
  id: string;
  customer: string | { id: string };
  status: string;
  cancel_at_period_end?: boolean;
  cancel_at?: number | null;
  current_period_end?: number;
  items?: { data?: { current_period_end?: number }[] };
  metadata?: Record<string, string>;
};

export function fetchSubscription(id: string) {
  return stripeRequest<StripeSubscription>('GET', `/subscriptions/${encodeURIComponent(id)}`);
}

// The end of the paid period. Stripe moved current_period_end from the
// subscription to its items in API version 2025-03-31; accept either.
function periodEnd(subscription: StripeSubscription): Date | null {
  const seconds = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end;
  return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
}

// Record a subscription for a user, found from the id we put in its metadata
// at checkout or, failing that, from the customer saved earlier. Returns false
// when it belongs to no known user (a subscription made outside this site).
export async function recordSubscription(subscription: StripeSubscription, knownUserId?: number | null): Promise<boolean> {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const fromMetadata = Number(subscription.metadata?.userId);
  const userId = knownUserId ?? (Number.isInteger(fromMetadata) && fromMetadata > 0 ? fromMetadata : await AdFreeSubscription.userIdForCustomer(customerId));
  if (!userId) return false;
  await AdFreeSubscription.save(userId, {
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: periodEnd(subscription),
    // Newer API versions schedule a cancellation as a cancel_at date and leave
    // cancel_at_period_end false; either means the plan will not renew.
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true || typeof subscription.cancel_at === 'number',
  });
  return true;
}

// The heavy user plan's $4 subscription (0191), found from heavyUserId in its
// metadata or the subscription saved earlier. False when it is nobody's.
export async function recordHeavySubscription(subscription: StripeSubscription): Promise<boolean> {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const fromMetadata = Number(subscription.metadata?.heavyUserId);
  const userId = Number.isInteger(fromMetadata) && fromMetadata > 0 ? fromMetadata : await HeavyUserPlan.userIdForSubscription(subscription.id);
  if (!userId) return false;
  await HeavyUserPlan.saveSubscription(userId, {
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: periodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true || typeof subscription.cancel_at === 'number',
  });
  return true;
}

// The $20 premium plan, found from premiumUserId in its metadata or the
// customer saved earlier. False when it is nobody's.
export async function recordPremiumSubscription(subscription: StripeSubscription): Promise<boolean> {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const fromMetadata = Number(subscription.metadata?.premiumUserId);
  const userId = Number.isInteger(fromMetadata) && fromMetadata > 0 ? fromMetadata : await PremiumSubscription.userIdForCustomer(customerId);
  if (!userId) return false;
  await PremiumSubscription.save(userId, {
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: periodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true || typeof subscription.cancel_at === 'number',
  });
  return true;
}

// The ad-free + premium bundle: one Stripe subscription that switches both
// plans on, so it is written to both tables (same customer and subscription
// id in each). Found from bundleUserId in its metadata or the customer saved
// earlier. False when it is nobody's.
export async function recordBundleSubscription(subscription: StripeSubscription): Promise<boolean> {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const fromMetadata = Number(subscription.metadata?.bundleUserId);
  const userId = Number.isInteger(fromMetadata) && fromMetadata > 0 ? fromMetadata : await PremiumSubscription.userIdForCustomer(customerId);
  if (!userId) return false;
  const fields = {
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: periodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true || typeof subscription.cancel_at === 'number',
  };
  await Promise.all([AdFreeSubscription.save(userId, fields), PremiumSubscription.save(userId, fields)]);
  return true;
}
