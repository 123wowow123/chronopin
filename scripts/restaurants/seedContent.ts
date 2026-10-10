// One-time migration from research snapshots. Runtime pages use the database;
// subsequent edits belong in the management API, never back in these files.
import menus from '@/server/data/restaurantMenus.json';
import details from '@/server/data/restaurantDetails.json';
import regional from '@/server/data/regionalRestaurants.json';
import tops from '@/server/data/topRestaurants.json';
import { restaurantSourceKey } from '@/lib/restaurantMenus';
import type { RestaurantMenuProfile } from '@/lib/restaurantMenus';
import type { RestaurantDetails } from '@/lib/restaurantDetails';
import type { RestaurantContentProfile, RestaurantTile } from '@/server/restaurantContentValidation';
import { restaurantPriceRange } from '@/server/restaurantPrice';
import type { QueryFn } from '@/server/db';

export function legacyRestaurantContent(): RestaurantContentProfile[] {
  const profiles = new Map<string, RestaurantContentProfile>();
  const get = (source: string) => {
    const key = restaurantSourceKey(source);
    if (!profiles.has(key)) profiles.set(key, { pinSourceUrl: source });
    return profiles.get(key)!;
  };
  for (const menu of menus) get(menu.pinSourceUrl).menu = menu as RestaurantMenuProfile;
  for (const detail of details) get(detail.pinSourceUrl).details = detail as RestaurantDetails;
  for (const entry of [...tops.map((t) => ({ ...t, kind: 'top' as const })), ...regional]) {
    const { regionSlug, slug, name, neighborhood, cuisine, description, address, image, imageCredit, checkedAt } = entry;
    get(entry.sourceUrl).tile = {
      regionSlug, slug, name, neighborhood, cuisine, description, address, image, imageCredit,
      checkedAt: checkedAt ?? ('day' in entry ? entry.day : '2026-10-10'),
      kind: entry.kind as 'top' | 'opening', websiteUrl: entry.websiteUrl ?? entry.sourceUrl,
      recognition: entry.recognition ?? '', priceRange: restaurantPriceRange(entry.sourceUrl) ?? '',
      imageSourceUrl: 'imageSourceUrl' in entry && entry.imageSourceUrl ? entry.imageSourceUrl : entry.sourceUrl,
      ...('imageNote' in entry ? { imageNote: entry.imageNote } : {}),
      ...('openingConfirmed' in entry && entry.openingConfirmed ? { openingConfirmed: true, day: entry.day } : {}),
    } as RestaurantTile;
  }
  return [...profiles.values()];
}
export async function seedRestaurantContent(query: QueryFn) {
  const profiles = legacyRestaurantContent();
  await query(`INSERT INTO "RestaurantContent" ("sourceKey", "profile")
    SELECT v."sourceKey", v."profile" FROM jsonb_to_recordset($1::jsonb) AS v("sourceKey" text, "profile" jsonb)
    ON CONFLICT ("sourceKey") DO NOTHING`, [JSON.stringify(profiles.map((profile) => ({ sourceKey: restaurantSourceKey(profile.pinSourceUrl), profile })))]);
  console.log(`Imported ${profiles.length} restaurant content records; existing edits preserved.`);
}
