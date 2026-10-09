import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { invalidateTimeline } from '@/server/services/cache';
import { seedRestaurants } from '@/server/services/restaurantSeed';

// Load the bundled restaurant catalogs into this server's database (docs/okf/api/restaurant-seed.md).
export const POST = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const body = await readJson(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Expected a JSON object');
  const { regions, specials, dryRun, userId } = body as Record<string, unknown>;
  if (regions !== undefined && !(Array.isArray(regions) && regions.length > 0 && regions.every((slug) => typeof slug === 'string'))) throw new HttpError(400, 'regions must be a non-empty array of region slugs');
  if (specials !== undefined && typeof specials !== 'boolean') throw new HttpError(400, 'specials must be boolean');
  if (dryRun !== undefined && typeof dryRun !== 'boolean') throw new HttpError(400, 'dryRun must be boolean');
  if (userId !== undefined && !Number.isSafeInteger(userId)) throw new HttpError(400, 'userId must be an integer');
  const result = await seedRestaurants({ regions: regions as string[] | undefined, specials: specials as boolean | undefined, dryRun: dryRun as boolean | undefined, userId: userId as number | undefined });
  if (!result.dryRun && (result.pinsAdded.length || result.mediaAttached.length || result.venuesAdded)) invalidateTimeline();
  console.log(`restaurant-seed by user ${admin.id}: ${result.pinsAdded.length} pins, ${result.mediaAttached.length} photos, ${result.venuesAdded} venues`);
  return json(result, 200, { 'Cache-Control': 'private, no-store' });
});
