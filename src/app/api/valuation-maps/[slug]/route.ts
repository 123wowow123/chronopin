import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import PremiumSubscription from '@/server/model/premiumSubscription';
import { personPage } from '@/server/services/people';
import { buildValuationMaps } from '@/server/valuationMaps';

// The Holdings map and the Valuation map (C-IV15) for a person: Premium readers
// (and admins) get the points; everyone else gets only { locked: true }. Per
// viewer, so never cached; the person page itself is cached for everyone.
// GET /api/valuation-maps/:slug   { locked: false, maps, iv15 } | { locked: true }
export const GET = route(async (request: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const user = await getUser(request);
  if (!user || !(await PremiumSubscription.hasAccess(user))) return json({ locked: true });
  const page = await personPage(slug);
  if (!page) throw new HttpError(404, 'Not Found');
  return json({ locked: false, ...(await buildValuationMaps(page.holdings, page.profile.name)) }, 200, { 'Cache-Control': 'private, no-store' });
});
