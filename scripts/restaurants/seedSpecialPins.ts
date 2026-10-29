import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { listSpecialVenues } from '@/server/model/restaurantSpecialVenue';
import Pin from '@/server/model/pin';

export async function seedSpecialPins(options: { dryRun?: boolean; regionSlug?: string } = {}) {
  const { dryRun = true, regionSlug } = options;
  const venues = await listSpecialVenues(regionSlug, false);
  const existingPins = await Pin.findBySourceUrls(venues.map((v) => v.profile.pinSourceUrl));
  const missing = venues.filter((v) => !existingPins.has(v.profile.pinSourceUrl));

  console.log(`Found ${venues.length} venues, ${existingPins.size} with pins, ${missing.length} missing pins.`);
  if (dryRun) {
    console.log(`[dry-run] ${missing.length} branches need reviewed opening evidence before pin creation.`);
    return { created: missing.length, dryRun: true };
  }

  if (!missing.length) return { created: 0, dryRun: false };
  throw new Error(
    'Automatic special-pin seeding requires reviewed branch-opening evidence. '
    + 'Do not use profile.checkedAt as an opening date. '
    + 'Use scripts/restaurants/repairSpecialPins.ts with a researched evidence file '
    + 'and an authenticated admin API instead.',
  );
}

// CLI runner
if (process.argv[1]?.endsWith('seedSpecialPins.ts')) {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: true },
      region: { type: 'string' },
    },
  });

  try {
    await seedSpecialPins({ dryRun: values['dry-run'], regionSlug: values.region });
  } finally {
    await db.closeConnection();
  }
}
