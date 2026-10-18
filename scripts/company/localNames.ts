// Looks up each company's names in other scripts (Company.localNames, 0105:
// 古驰, 구찌, غوتشي for Gucci) from Wikidata, which search hands the semantic
// model beside the company's own name (src/server/companyNames.ts). A new
// company gets its own when it is first seen; this is the backfill.
//
//   npm run companies:local-names           companies never looked up
//   npm run companies:local-names -- --all  every company again

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Company from '@/server/model/company';

const { values: flags } = parseArgs({ options: { all: { type: 'boolean', default: false } } });
const BATCH = 200;

async function run() {
  const companies = await Company.needingLocalNames(flags.all);
  console.log(`Looking up local names for ${companies.length} companies`);
  let named = 0;
  for (let i = 0; i < companies.length; i += BATCH) {
    const batch = companies.slice(i, i + BATCH);
    const found = await Company.findLocalNames(batch.map((c) => c.id));
    named += found.filter((f) => f.names.length).length;
    console.log(`  ${Math.min(i + BATCH, companies.length)}/${companies.length}, ${named} with names`);
  }
}

run()
  .catch((err) => {
    console.log('Company local names err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
