import { scheduleAdTranslation } from '@/server/services/sponsoredAdTranslations';
import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { emailConfirmationPending } from '@/lib/emailConfirmation';
import { HttpError, json, readJson, route } from '@/server/http';
import SponsoredAd from '@/server/model/sponsoredAd';
import { parseFields } from '@/server/services/sponsoredAds';

// The signed-in user's own ads with how they are doing.
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const ads = await SponsoredAd.listForUser(user.id);
  const stats = await SponsoredAd.stats(ads.map((ad) => ad.id));
  return json(ads.map((ad) => ({ ...ad, stats: stats.get(ad.id) })));
});

// Start an ad: headline, text, link and package. Nothing is shown until it is
// paid for and reviewed.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (emailConfirmationPending(user)) throw new HttpError(403, 'Confirm your email address before buying an ad.', { code: 'emailUnverified', message: 'Confirm your email address before buying an ad.' });
  const fields = parseFields(await readJson(request));
  const ad = await SponsoredAd.create(user.id, fields);
  scheduleAdTranslation(ad);
  return json(ad, 201);
});
