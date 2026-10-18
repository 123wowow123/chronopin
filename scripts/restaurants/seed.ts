// Add the checked restaurant catalog to the configured database without
// replacing existing pins. Upload and verify the images in Azure first.
// The logic lives in src/server/services/restaurantSeed.ts, which is also what
// POST /api/admin/restaurant-seed runs on a deployed server: use that API for prod.
import '../env';
import { parseArgs } from 'node:util';
import { seedRestaurants } from '@/server/services/restaurantSeed';
import * as db from '@/server/db';

const { values } = parseArgs({ options: { 'user-id': { type: 'string' }, regions: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } } });
try {
  const result = await seedRestaurants({
    regions: values.regions?.split(',').map((slug) => slug.trim()),
    userId: values['user-id'] ? Number(values['user-id']) : undefined,
    dryRun: values['dry-run'],
  });
  for (const pin of result.pinsAdded) console.log(`${pin.id}: ${pin.title}`);
  for (const title of result.pinsWouldAdd) console.log(`would add: ${title}`);
  console.log(`${result.dryRun ? 'Would add' : 'Added'} ${result.dryRun ? result.pinsWouldAdd.length : result.pinsAdded.length} restaurant pins, `
    + `${result.dryRun ? 'would attach' : 'attached'} photos to ${result.mediaAttached.length} existing pins, ${result.venuesAdded} new special venues; existing records were preserved.`);
} finally {
  await db.closeConnection();
}
