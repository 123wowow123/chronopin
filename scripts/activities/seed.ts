// Add the checked seasonal-activity catalog to the configured database as pins by @TravelDesk.
// Existing pins (matched by sourceUrl) are linked, never rewritten.
import '../env';
import { parseArgs } from 'node:util';
import { seedActivities } from '@/server/services/activitySeed';
import * as db from '@/server/db';

const { values } = parseArgs({ options: { cities: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } } });
try {
  const result = await seedActivities({ cities: values.cities?.split(',').map((s) => s.trim()), dryRun: values['dry-run'] });
  if (result.problems.length) {
    for (const problem of result.problems) console.error(problem);
    process.exitCode = 1;
  } else {
    for (const pin of result.pinsAdded) console.log(`${pin.id}: ${pin.title}`);
    console.log(`${result.dryRun ? 'Dry run: ' : ''}added ${result.pinsAdded.length} pins, ${result.pinsLinked} already existed, ${result.photosAttached} photos attached.`);
  }
} finally {
  await db.closeConnection();
}
