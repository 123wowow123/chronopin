import * as db from '../db';
import { HttpError } from '../util/httpError';
import { specialVenueSourceKey, type SpecialVenueInput } from '../restaurantSpecialValidation';
import { restaurantSourceKey } from '@/lib/restaurantMenus';

export type RestaurantSpecialVenue = SpecialVenueInput & { id: number; revision: number; utcUpdatedDateTime: Date };

export async function listSpecialVenues(regionSlug?: string, includeDisabled = false): Promise<RestaurantSpecialVenue[]> {
  return db.query<RestaurantSpecialVenue>(`SELECT "id", "regionSlug", "profile", "enabled", "revision", "utcUpdatedDateTime"
    FROM "RestaurantSpecialVenue" WHERE ($1::text IS NULL OR "regionSlug" = $1) AND ($2 OR "enabled") ORDER BY "id"`, [regionSlug ?? null, includeDisabled]);
}
export async function getSpecialVenue(id: number): Promise<RestaurantSpecialVenue> {
  const [row] = await db.query<RestaurantSpecialVenue>('SELECT * FROM "RestaurantSpecialVenue" WHERE "id" = $1', [id]);
  if (!row) throw new HttpError(404, 'Restaurant special venue not found');
  return row;
}
export async function specialVenueForSource(sourceUrl: string | null | undefined): Promise<RestaurantSpecialVenue | null> {
  if (!sourceUrl) return null;
  const [row] = await db.query<RestaurantSpecialVenue>('SELECT * FROM "RestaurantSpecialVenue" WHERE "sourceKey" = $1 AND "enabled"', [restaurantSourceKey(sourceUrl)]);
  return row ?? null;
}
async function audit(query: db.QueryFn, userId: number, before: RestaurantSpecialVenue | null, after: RestaurantSpecialVenue) {
  await query(`INSERT INTO "AdminAudit" ("userId", "action", "table", "key", "before", "after") VALUES ($1, $2, 'RestaurantSpecialVenue', $3::jsonb, $4::jsonb, $5::jsonb)`, [userId, before ? 'update' : 'insert', JSON.stringify({ id: after.id }), before ? JSON.stringify(before) : null, JSON.stringify(after)]);
}
export async function createSpecialVenue(input: SpecialVenueInput, userId: number): Promise<RestaurantSpecialVenue> {
  return db.transaction(async (query) => {
    const [row] = await query<RestaurantSpecialVenue>(`INSERT INTO "RestaurantSpecialVenue" ("sourceKey", "regionSlug", "profile", "enabled", "userId")
      VALUES ($1, $2, $3::jsonb, $4, $5) ON CONFLICT ("sourceKey") DO NOTHING RETURNING *`, [specialVenueSourceKey(input), input.regionSlug, JSON.stringify(input.profile), input.enabled, userId]);
    if (!row) throw new HttpError(409, 'This venue source already exists');
    await audit(query, userId, null, row); return row;
  });
}
export async function updateSpecialVenue(id: number, revision: number, input: SpecialVenueInput | { enabled: boolean }, userId: number): Promise<RestaurantSpecialVenue> {
  return db.transaction(async (query) => {
    const [before] = await query<RestaurantSpecialVenue>('SELECT * FROM "RestaurantSpecialVenue" WHERE "id" = $1 FOR UPDATE', [id]);
    if (!before) throw new HttpError(404, 'Restaurant special venue not found');
    if (before.revision !== revision) throw new HttpError(409, 'Venue changed; fetch its current revision before saving');
    const value = 'profile' in input ? input : { regionSlug: before.regionSlug, profile: before.profile, enabled: input.enabled };
    const [row] = await query<RestaurantSpecialVenue>(`UPDATE "RestaurantSpecialVenue" SET "sourceKey" = $2, "regionSlug" = $3, "profile" = $4::jsonb,
      "enabled" = $5, "userId" = $6, "revision" = "revision" + 1, "utcUpdatedDateTime" = now() WHERE "id" = $1 RETURNING *`, [id, specialVenueSourceKey(value), value.regionSlug, JSON.stringify(value.profile), value.enabled, userId]);
    await audit(query, userId, before, row); return row;
  }).catch((err) => { if (err?.code === '23505') throw new HttpError(409, 'This venue source already exists'); throw err; });
}
