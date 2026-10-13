import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, route } from '@/server/http';
import SponsoredAd from '@/server/model/sponsoredAd';
import { storeImage } from '@/server/services/sponsoredAds';

// The ad's picture (multipart field `picture`), square, shown beside the headline.
export const PUT = route(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  const id = intParam((await params).id);
  if (!(await SponsoredAd.getOwned(id, user.id))) throw new HttpError(404, 'Not Found');
  const form = await request.formData().catch(() => null);
  const file = form?.get('picture');
  if (!(file instanceof File) || !file.size) throw new HttpError(400, 'Choose an image to upload.', { message: 'Choose an image to upload.' });
  return json({ imageUrl: await storeImage(id, user.id, file) });
});
