import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { invalidatePin, invalidateTimeline } from '@/server/services/cache';
import { indexActivityPins, seedActivities } from '@/server/services/activitySeed';

// Load the bundled seasonal-activity catalog and photo manifest into this server's database. Existing pins are linked, not rewritten.
export const POST = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const body = (await readJson(request)) ?? {};
  if (typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Expected a JSON object');
  const { cities, dryRun, index } = body as Record<string, unknown>;
  if (cities !== undefined && !(Array.isArray(cities) && cities.length > 0 && cities.every((slug) => typeof slug === 'string'))) throw new HttpError(400, 'cities must be a non-empty array of city slugs');
  if (dryRun !== undefined && typeof dryRun !== 'boolean') throw new HttpError(400, 'dryRun must be boolean');
  if (index !== undefined && typeof index !== 'boolean') throw new HttpError(400, 'index must be boolean');
  // index:true only (re)indexes the catalog's pins for search; it seeds nothing.
  if (index) return json(await indexActivityPins(), 200, { 'Cache-Control': 'private, no-store' });
  const result = await seedActivities({ cities: cities as string[] | undefined, dryRun: dryRun as boolean | undefined });
  if (result.problems.length) throw new HttpError(422, `Catalog problems: ${result.problems.slice(0, 5).join('; ')}`);
  if (!result.dryRun) {
    for (const pin of result.pinsAdded) invalidatePin(pin.id);
    if (result.pinsAdded.length || result.photosAttached) invalidateTimeline();
  }
  console.log(`activity-seed by user ${admin.id}: ${result.pinsAdded.length} pins, ${result.photosAttached} photos`);
  return json(result, 200, { 'Cache-Control': 'private, no-store' });
});
