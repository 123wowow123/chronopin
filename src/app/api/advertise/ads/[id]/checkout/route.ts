import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { emailConfirmationPending } from '@/lib/emailConfirmation';
import { HttpError, intParam, json, publicOrigin, route } from '@/server/http';
import SponsoredAd from '@/server/model/sponsoredAd';
import { startCheckout } from '@/server/services/sponsoredAds';

// Pay for the ad: answers with Stripe Checkout's page.
export const POST = route(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  if (emailConfirmationPending(user)) throw new HttpError(403, 'Confirm your email address before buying an ad.', { code: 'emailUnverified' });
  const ad = await SponsoredAd.getOwned(intParam((await params).id), user.id);
  if (!ad) throw new HttpError(404, 'Not Found');
  return json({ url: await startCheckout(ad, publicOrigin(request), user.email ?? null) });
});
