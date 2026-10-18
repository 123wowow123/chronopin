// Looks up logos for companies that have not had one looked for yet (a new
// company normally gets this in the background when its first pin is saved).
//
//   npm run companies:logos            only companies never checked
//   npm run companies:logos -- --all   every company again
//
// For a company with no Wikipedia article, set "Company"."websiteUrl" by hand
// first; its site icon is then used. See src/server/companyLogo.ts.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Company from '@/server/model/company';

const { values: flags } = parseArgs({ options: { all: { type: 'boolean', default: false } } });

async function run() {
  const companies = await Company.needingLogo(flags.all);
  console.log(`Looking up logos for ${companies.length} companies`);
  const found = await Company.findLogos(companies);
  const missing = found.filter((f) => !f.logoUrl);
  console.log(`Found ${found.length - missing.length}, none for ${missing.length}`);
}

run()
  .catch((err) => {
    console.log('Company logos err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
