// Looks up a line about each company that has not had one looked for yet (a
// new company normally gets this in the background when its first pin is
// saved). It is what a company: search shows above its results.
//
//   npm run companies:describe            only companies never checked
//   npm run companies:describe -- --all   every company again
//
// The text comes from the first sentences of the company's Wikipedia article;
// a company with no article gets none. See src/server/companyDescription.ts.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Company from '@/server/model/company';

const { values: flags } = parseArgs({ options: { all: { type: 'boolean', default: false } } });

async function run() {
  const companies = await Company.needingDescription(flags.all);
  console.log(`Looking up descriptions for ${companies.length} companies`);
  const found = await Company.findDescriptions(companies);
  const missing = found.filter((f) => !f.description && !f.failed);
  const failed = found.filter((f) => f.failed);
  console.log(`Found ${found.length - missing.length - failed.length}, none for ${missing.length}, turned away for ${failed.length}`);
  const name = (id: number) => companies.find((c) => c.id === id)?.name;
  for (const company of missing) {
    console.log(`  no description: ${name(company.id)}`);
  }
  // Left unchecked on purpose: running the script again picks these up.
  for (const company of failed) {
    console.log(`  lookup turned away: ${name(company.id)}`);
  }
}

run()
  .catch((err) => {
    console.log('Company descriptions err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
