import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Ad from '@/server/model/ad';
import SponsoredAd from '@/server/model/sponsoredAd';
import { rejectAd } from '@/server/services/sponsoredAds';

// { action: 'approve' } | { action: 'reject', reason } | { action: 'refunded' }
// (the refund of a rejected ad was made by hand in Stripe).
export const POST = route(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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
