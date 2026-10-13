import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { json, route } from '@/server/http';
import SponsoredAd from '@/server/model/sponsoredAd';

// The ads waiting for review, and those whose refund Stripe would not make.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await SponsoredAd.reviewQueue());
});
