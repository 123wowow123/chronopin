import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { createRestaurantContent, listRestaurantContent } from '@/server/model/restaurantContent';
import { parseRestaurantContent } from '@/server/restaurantContentValidation';
import { invalidateRestaurantContent, verifyRestaurantTilePhoto } from '@/server/services/restaurantContent';
import { RESTAURANT_REGIONS } from '@/lib/restaurants';
const headers = { 'Cache-Control': 'private, no-store' };
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const q = request.nextUrl.searchParams;
  const region = q.get('region') ?? undefined;
  if (region && !RESTAURANT_REGIONS.some((r) => r.slug === region)) throw new HttpError(400, 'Unknown region');
  const limit = Number(q.get('limit') ?? 100), offset = Number(q.get('offset') ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000 || !Number.isSafeInteger(offset) || offset < 0) throw new HttpError(400, 'Invalid pagination');
  return json({ content: await listRestaurantContent({ region, sources: q.has('sourceUrl') ? [q.get('sourceUrl')!] : undefined, includeDisabled: true, limit, offset }) }, 200, headers);
});
export const POST = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const input = parseRestaurantContent(await readJson(request));
  await verifyRestaurantTilePhoto(input.profile);
  const saved = await createRestaurantContent(input, admin.id);
  await invalidateRestaurantContent(saved.profile.pinSourceUrl);
  return json(saved, 201, headers);
});
