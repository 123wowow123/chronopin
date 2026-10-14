import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, route } from '@/server/http';
import SponsoredAd from '@/server/model/sponsoredAd';
import { storeImageAsAdmin } from '@/server/services/sponsoredAds';

// Set the ad's picture in any state (multipart field `picture`).
export const PUT = route(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole('admin', request);
  const id = intParam((await params).id);
  const ad = await SponsoredAd.get(id);
  if (!ad) throw new HttpError(404, 'No such ad.');
  const form = await request.formData().catch(() => null);
  const file = form?.get('picture');
  if (!(file instanceof File) || !file.size) throw new HttpError(400, 'Choose an image to upload.');
  return json({ imageUrl: await storeImageAsAdmin(id, ad.userId, file) });
});
