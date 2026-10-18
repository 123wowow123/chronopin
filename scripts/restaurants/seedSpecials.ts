// One-time catalog import. Re-running never replaces an edited/disabled row.
import '../env';
import { parseArgs } from 'node:util';
import venues from '@/server/data/restaurantSpecials.json';
import menus from '@/server/data/restaurantMenus.json';
import { parseSpecialVenue, specialVenueSourceKey } from '@/server/restaurantSpecialValidation';
import * as db from '@/server/db';

const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean', default: false } } });
const inputs = [
  ...venues.map(({ regionSlug, ...profile }) => parseSpecialVenue({ regionSlug, profile })),
  ...menus.filter((profile) => profile.specials.length).map((profile) => parseSpecialVenue({ profile })),
];
try {
  if (values['dry-run']) console.log(`Validated ${inputs.length} catalog venues`);
  else {
    const count = await db.transaction(async (query) => {
      let added = 0;
      for (const input of inputs) {
        const rows = await query(`INSERT INTO "RestaurantSpecialVenue" ("sourceKey", "regionSlug", "profile", "enabled")
          VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT ("sourceKey") DO NOTHING RETURNING "id"`, [specialVenueSourceKey(input), input.regionSlug, JSON.stringify(input.profile), input.enabled]);
        added += rows.length;
      }
      return added;
    });
    console.log(`Imported ${count} new venues; existing records preserved`);
  }
} finally { await db.closeConnection(); }
