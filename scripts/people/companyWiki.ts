// Compiles the wiki behind every company (0206), or one (--id N). Re-run after changing sectors, executives or
// trades; the committees step (`people:committees`) feeds the sector and conflict lines.
//
//   npm run companies:wiki [-- --id N]

import '../env';
import { parseArgs } from 'node:util';
import CompanyWiki from '@/server/model/companyWiki';

const { values } = parseArgs({ options: { id: { type: 'string' } } });
(async () => {
  const n = values.id ? ((await CompanyWiki.rebuild(Number(values.id))) ? 1 : 0) : await CompanyWiki.rebuildAll();
  console.log(`${n} company wiki(s) built`);
  process.exit(0);
})();
