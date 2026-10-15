import { scheduleAdTranslation } from '@/server/services/sponsoredAdTranslations';
import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import * as azureBlob from '@/server/azureBlob';
import Ad from '@/server/model/ad';
import SponsoredAd from '@/server/model/sponsoredAd';
import { parseAdminFields, rejectAd } from '@/server/services/sponsoredAds';

// One ad, with its tracking.
export const GET = route(async (request: NextRequest, { params }: Ctx) => {
  await requireRole('admin', request);
  const id = intParam((await params).id);
  const ad = await SponsoredAd.get(id);
  if (!ad) throw new HttpError(404, 'No such ad.');
  return json({ ...ad, stats: (await SponsoredAd.stats([id])).get(id) });
});

// Change any of title, body, url, impressions, priceCents, status, dailyLimit,
// rejectionReason; fields left out stay as they are.
export const PATCH = route(async (request: NextRequest, { params }: Ctx) => {
  await requireRole('admin', request);
  const id = intParam((await params).id);
  const patch = parseAdminFields(await readJson(request), true);
  const ad = await SponsoredAd.adminUpdate(id, patch);
  if (!ad) throw new HttpError(404, 'No such ad.');
  Ad.expireInventory();
  scheduleAdTranslation(ad);
  return json(ad);
});

// Remove an ad (and its picture) whatever its state.
export const DELETE = route(async (request: NextRequest, { params }: Ctx) => {
  await requireRole('admin', request);
  const removed = await SponsoredAd.adminDelete(intParam((await params).id));
  if (!removed) throw new HttpError(404, 'No such ad.');
  if (removed.imageName?.startsWith('adimg/')) await azureBlob.deleteThumb(removed.imageName).catch(() => {});
  Ad.expireInventory();
  return noContent();
});

// { action: 'approve' } | { action: 'reject', reason } | { action: 'refunded' }
// (the refund of a rejected ad was made by hand in Stripe).
type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: NextRequest, { params }: Ctx) => {
  await requireRole('admin', request);
  const id = intParam((await params).id);
  const body = await readJson(request);
  if (body.action === 'approve') {
    if (!(await SponsoredAd.approve(id))) throw new HttpError(409, 'That ad is not waiting for review.');
    Ad.expireInventory();
    return json({ ok: true });
  }
  if (body.action === 'reject') {
    const reason = String(body.reason ?? '').trim().slice(0, 300);
    if (!reason) throw new HttpError(422, 'Say why, so the advertiser can fix it.', { message: 'Say why, so the advertiser can fix it.' });
    return json(await rejectAd(id, reason));
  }
  if (body.action === 'refunded') {
    await SponsoredAd.refunded(id);
    return json({ ok: true });
  }
  throw new HttpError(400, 'Unknown action.');
});
