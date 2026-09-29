// Reads stored listings' prices again from their stores, as the server does
// every day (src/server/services/listingPrices.ts), for a run by hand.
//
//   npm run merchants:prices                       what would change, due listings
//   npm run merchants:prices -- --all              every purchase listing
//   npm run merchants:prices -- --ids 213,160      these Merchant ids
//   npm run merchants:prices -- --apply            change it
//
// Read the dry run's titles: a store can redirect a listing to another
// variant. A price moving more than 3x is held rather than saved.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { refreshListingPrices } from '@/server/services/listingPrices';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    all: { type: 'boolean', default: false },
    ids: { type: 'string' },
  },
});

async function run() {
  const ids = flags.ids?.split(',').map(Number).filter(Number.isInteger);
  const totals = await refreshListingPrices({ apply: flags.apply, all: flags.all, ids, report: (line) => console.log(line) });
  console.log(`${flags.apply ? 'Saved' : 'Dry run'}:`, totals);
}

run()
  .catch((err) => {
    console.log('Listing prices err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
