import { scheduleAdTranslation } from '@/server/services/sponsoredAdTranslations';
import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import Ad from '@/server/model/ad';
import SponsoredAd from '@/server/model/sponsoredAd';
import { parseAdminFields } from '@/server/services/sponsoredAds';

// Without a query: the ads waiting for review, and those whose refund Stripe
// would not make. With ?status= and/or ?userId=: every matching ad, newest first.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const params = request.nextUrl.searchParams;
  const status = params.get('status');
  const userId = params.get('userId');
  if (status === null && userId === null) return json(await SponsoredAd.reviewQueue());
  const owner = userId === null ? undefined : Number(userId);
  if (owner !== undefined && !Number.isInteger(owner)) throw new HttpError(400, 'userId must be a number.');
  return json(await SponsoredAd.adminList({ status: status ?? undefined, userId: owner }));
});

// Create an ad for any user (default: the caller), with no payment. Body:
// { title, body?, url, impressions?, priceCents?, status? ('active' by
// default), dailyLimit?, userId? }.
export const POST = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const body = await readJson(request);
  const fields = parseAdminFields(body, false);
  const userId = body.userId === undefined ? admin.id : Number(body.userId);
  if (!Number.isInteger(userId)) throw new HttpError(400, 'userId must be a number.');
  const ad = await SponsoredAd.adminCreate({
    userId,
    title: fields.title!,
    body: fields.body!,
    url: fields.url!,
    impressionsBought: fields.impressionsBought!,
    priceCents: fields.priceCents ?? 1,
    status: fields.status ?? 'active',
    dailyLimit: fields.dailyLimit ?? null,
    autoTranslate: fields.autoTranslate ?? true,
  });
  Ad.expireInventory();
  scheduleAdTranslation(ad);
  return json(ad, 201);
});
