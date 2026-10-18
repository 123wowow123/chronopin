import type { NextRequest } from 'next/server';
import { validateAmazonTags } from '@/lib/ads';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import Ad from '@/server/model/ad';
import { getAmazonTags, setAmazonTags } from '@/server/model/appSetting';

// The Amazon Associates tracking id of each store but the US. A store's ads
// are served once it has one and has ads of its own (src/lib/ads.ts servingStore).
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getAmazonTags());
});

// Replaces the ids: a store left out, or sent as "", is taken off.
export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = validateAmazonTags(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setAmazonTags(parsed.tags, admin.id);
  Ad.expireInventory();
  return json(parsed.tags);
});
