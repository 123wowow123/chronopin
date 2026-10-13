import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import SponsoredAd from '@/server/model/sponsoredAd';
import Ad from '@/server/model/ad';
import * as azureBlob from '@/server/azureBlob';
import { parseFields } from '@/server/services/sponsoredAds';

type Ctx = { params: Promise<{ id: string }> };

// Change an ad that is not paid for yet; or pause / resume a live one with
// { paused: true | false }.
export const PATCH = route(async (request: NextRequest, { params }: Ctx) => {
  const user = await requireUser(request);
  const id = intParam((await params).id);
  const body = await readJson(request);
  if (typeof body.paused === 'boolean') {
    if (!(await SponsoredAd.setPaused(id, user.id, body.paused))) throw new HttpError(409, 'That ad cannot be paused or resumed now.');
    Ad.expireInventory();
    return json({ ok: true });
  }
  const ad = await SponsoredAd.update(id, user.id, parseFields(body));
  if (!ad) throw new HttpError(409, 'This ad is paid for and can no longer be changed.');
  return json(ad);
});

// Throw away an ad that was never paid for.
export const DELETE = route(async (request: NextRequest, { params }: Ctx) => {
  const user = await requireUser(request);
  const removed = await SponsoredAd.remove(intParam((await params).id), user.id);
  if (!removed) throw new HttpError(409, 'Only an ad that is not paid for can be deleted.');
  if (removed.imageName?.startsWith('adimg/')) await azureBlob.deleteThumb(removed.imageName).catch(() => {});
  return noContent();
});
