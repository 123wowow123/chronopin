'use strict';

// Looks up logos for companies that have not had one looked for yet (a new
// company normally gets this in the background when its first pin is saved).
//
//   npm run companies:logos            only companies never checked
//   npm run companies:logos -- --all   every company again
//
// For a company with no Wikipedia article, set "Company"."websiteUrl" by hand
// first; its site icon is then used. See server/company/logo.js.

require('@babel/register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const args = require('args');
const db = require('../../server/db');
const Company = require('../../server/model/company/company').default;

args.option('all', 'Look again for every company, not just unchecked ones', false);
const flags = args.parse(process.argv);

Company.needingLogo(flags.all)
  .then(companies => {
    console.log(`Looking up logos for ${companies.length} companies`);
    return Company.findLogos(companies);
  })
  .then(found => {
    const missing = found.filter(f => !f.logoUrl);
    console.log(`Found ${found.length - missing.length}, none for ${missing.length}`);
  })
  .catch(err => {
    console.log('Company logos err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
