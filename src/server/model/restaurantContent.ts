import * as db from '../db';
import { HttpError } from '../util/httpError';
import { restaurantSourceKey } from '@/lib/restaurantMenus';
import type { RestaurantContentInput } from '../restaurantContentValidation';
export type RestaurantContent = RestaurantContentInput & { id: number; revision: number; utcUpdatedDateTime: Date };
export async function listRestaurantContent(options: { region?: string; sources?: string[]; includeDisabled?: boolean; limit?: number; offset?: number } = {}): Promise<RestaurantContent[]> {
  return db.query<RestaurantContent>(`SELECT * FROM "RestaurantContent" WHERE ($1::text IS NULL OR "profile"->'tile'->>'regionSlug' = $1)
    AND ($2::text[] IS NULL OR "sourceKey" = ANY($2)) AND ($3 OR "enabled") ORDER BY "id" LIMIT $4 OFFSET $5`,
  [options.region ?? null, options.sources?.map(restaurantSourceKey) ?? null, options.includeDisabled ?? false, options.limit ?? null, options.offset ?? 0]);
}
export async function contentForSource(source: string | null | undefined): Promise<RestaurantContent | null> {
  if (!source) return null;
  return (await listRestaurantContent({ sources: [source], limit: 1 }))[0] ?? null;
}
export async function getRestaurantContent(id: number): Promise<RestaurantContent> {
  const [row] = await db.query<RestaurantContent>('SELECT * FROM "RestaurantContent" WHERE "id" = $1', [id]);
  if (!row) throw new HttpError(404, 'Restaurant content not found');
  return row;
}
async function audit(query: db.QueryFn, userId: number, before: RestaurantContent | null, after: RestaurantContent) {
  await query(`INSERT INTO "AdminAudit" ("userId", "action", "table", "key", "before", "after") VALUES ($1, $2, 'RestaurantContent', $3::jsonb, $4::jsonb, $5::jsonb)`, [userId, before ? 'update' : 'insert', JSON.stringify({ id: after.id }), before ? JSON.stringify(before) : null, JSON.stringify(after)]);
}
export async function createRestaurantContent(input: RestaurantContentInput, userId: number): Promise<RestaurantContent> {
  return db.transaction(async (query) => {
    const [row] = await query<RestaurantContent>(`INSERT INTO "RestaurantContent" ("sourceKey", "profile", "enabled", "userId") VALUES ($1, $2::jsonb, $3, $4) ON CONFLICT ("sourceKey") DO NOTHING RETURNING *`, [restaurantSourceKey(input.profile.pinSourceUrl), JSON.stringify(input.profile), input.enabled, userId]);
    if (!row) throw new HttpError(409, 'Restaurant content for this branch source already exists');
    await audit(query, userId, null, row); return row;
  });
}
export async function updateRestaurantContent(id: number, revision: number, input: RestaurantContentInput | { enabled: boolean }, userId: number): Promise<RestaurantContent> {
  return db.transaction(async (query) => {
    const [before] = await query<RestaurantContent>('SELECT * FROM "RestaurantContent" WHERE "id" = $1 FOR UPDATE', [id]);
    if (!before) throw new HttpError(404, 'Restaurant content not found');
    if (before.revision !== revision) throw new HttpError(409, 'Content changed; fetch its current revision before saving');
    const value = 'profile' in input ? input : { profile: before.profile, enabled: input.enabled };
    if (restaurantSourceKey(value.profile.pinSourceUrl) !== restaurantSourceKey(before.profile.pinSourceUrl)) throw new HttpError(400, 'Branch source cannot be changed; create a separate record');
    const [row] = await query<RestaurantContent>(`UPDATE "RestaurantContent" SET "profile" = $2::jsonb, "enabled" = $3, "userId" = $4, "revision" = "revision" + 1, "utcUpdatedDateTime" = now() WHERE "id" = $1 RETURNING *`, [id, JSON.stringify(value.profile), value.enabled, userId]);
    await audit(query, userId, before, row); return row;
  });
}
