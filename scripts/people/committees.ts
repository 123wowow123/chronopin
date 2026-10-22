// Committee seats for sitting members of Congress and the sector of every traded ticker,
// the two inputs of the conflict-of-interest mark on stock trades (src/lib/conflicts.ts).
// The work lives in src/server/services/conflictData.ts, which the admin API
// (/api/admin/conflicts) shares.
//
//   npm run people:committees                 all three, against the local DB
//   npm run people:committees -- --seats      only committee seats (congress-legislators, today's)
//   npm run people:committees -- --sectors    only ticker sectors (SEC SIC codes, ~8 requests a second)
//   npm run people:committees -- --names      sector from the asset's name for every trade (bonds, funds, ADRs)

import '../env';
import { parseArgs } from 'node:util';
import { classifyNames, classifyTickers, refreshSeats } from '@/server/services/conflictData';

const { values: flags } = parseArgs({ options: { seats: { type: 'boolean', default: false }, names: { type: 'boolean', default: false }, sectors: { type: 'boolean', default: false } } });
const both = !flags.seats && !flags.sectors && !flags.names;

(async () => {
  if (both || flags.seats) {
    const r = await refreshSeats();
    console.log(`${r.seats} committee seats stored; ${r.unmatched.length} members without a page: ${r.unmatched.slice(0, 15).join(', ')}`);
  }
  if (both || flags.sectors) console.log(`${await classifyTickers(console.log)} tickers classified`);
  if (both || flags.names) {
    const r = await classifyNames();
    console.log(`${r.classified} of ${r.holdings} distinct holdings classified by name`);
  }
  process.exit(0);
})();
