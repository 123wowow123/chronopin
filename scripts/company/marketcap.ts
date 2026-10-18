// Reads each listed company's market value from Nasdaq (Company.marketCap),
// which weighs its pins on a crowded timeline day (src/lib/bagSample.ts). Pins
// refresh it weekly as they sync; this is the backfill.
//
//   npm run companies:marketcap           companies never read or read over a week ago
//   npm run companies:marketcap -- --all  every company with a ticker again

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { refreshMarketCap } from '@/server/services/pinStocks';

const { values: flags } = parseArgs({ options: { all: { type: 'boolean', default: false } } });

async function run() {
  const companies = await db.query<{ id: number; name: string; tickerSymbol: string }>(
    `SELECT "id", "name"::text AS "name", "tickerSymbol" FROM "Company" WHERE "tickerSymbol" IS NOT NULL ORDER BY "id"`,
  );
  console.log(`Reading market caps for ${companies.length} listed companies`);
  for (const c of companies) {
    const cap = await refreshMarketCap(c.id, c.tickerSymbol, { force: flags.all });
    console.log(`  ${c.name} (${c.tickerSymbol}): ${cap == null ? 'none' : `$${(cap / 1e9).toFixed(1)}B`}`);
  }
}

run()
  .catch((err) => {
    console.log('Company market caps err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
