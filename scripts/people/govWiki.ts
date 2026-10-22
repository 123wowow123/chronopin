// Compiles the OKF wikis of committees and trade filings (0207). Re-run after `people:committees` or new trades.
//
//   npm run gov:wiki [-- --committees | --filings]

import '../env';
import { parseArgs } from 'node:util';
import GovWiki from '@/server/model/govWiki';

const { values } = parseArgs({ options: { committees: { type: 'boolean', default: false }, filings: { type: 'boolean', default: false } } });
const both = !values.committees && !values.filings;
(async () => {
  if (both || values.committees) console.log(`${await GovWiki.rebuildCommittees()} committee wiki(s) built`);
  if (both || values.filings) console.log(`${await GovWiki.rebuildFilings()} filing wiki(s) built`);
  process.exit(0);
})();
