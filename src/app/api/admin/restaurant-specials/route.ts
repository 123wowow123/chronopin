import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { createSpecialVenue, listSpecialVenues } from '@/server/model/restaurantSpecialVenue';
import { parseSpecialVenue } from '@/server/restaurantSpecialValidation';
import { RESTAURANT_REGIONS } from '@/lib/restaurants';

const headers = { 'Cache-Control': 'private, no-store' };
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const region = request.nextUrl.searchParams.get('region') ?? undefined;
  if (region && !RESTAURANT_REGIONS.some((r) => r.slug === region)) throw new HttpError(400, 'Unknown region');
  return json({ venues: await listSpecialVenues(region, true) }, 200, headers);
});
export const POST = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  return json(await createSpecialVenue(parseSpecialVenue(await readJson(request)), admin.id), 201, headers);
});
