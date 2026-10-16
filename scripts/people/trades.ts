// Reads the stock trades members of Congress disclose (STOCK Act periodic
// transaction reports) and saves them for their person pages.
//
//   npm run people:trades -- --house [--year 2026] [--limit 50] [--dry-run]
//       the House Clerk's index + each report's PDF (pdftotext must be installed)
//   npm run people:trades -- --senate [--days 365]
//       the Senate's eFD search (the "I agree" step is done with a cookie jar)
//   --prod --token-file <admin token file>
//       POST to www.chronopin.com/api/admin/person-trades instead of the local
//       database (watchers on prod are told about new trades)
//
// The news job's personTrades task runs the same import (src/server/services/
// personTradesImport.ts) twice a day. A filing already stored is skipped
// without being downloaded again. Members are matched on name + state; one
// that matches nobody is listed, never guessed.

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { importTrades } from '@/server/services/personTradesImport';

const { values: flags } = parseArgs({
  options: {
    house: { type: 'boolean', default: false },
    senate: { type: 'boolean', default: false },
    year: { type: 'string' },
    days: { type: 'string', default: '365' },
    limit: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    prod: { type: 'boolean', default: false },
    base: { type: 'string', default: 'https://www.chronopin.com' },
    'token-file': { type: 'string' },
  },
});

const sent: Record<string, unknown>[] = [];

async function main() {
  if (!flags.house && !flags.senate) {
    console.log('Pass --house and/or --senate');
    return;
  }
  const result = await importTrades({
    house: flags.house,
    senate: flags.senate,
    year: flags.year ? Number(flags.year) : undefined,
    days: Number(flags.days),
    limit: flags.limit ? Number(flags.limit) : undefined,
    skipStored: !flags.prod && !flags['dry-run'],
    log: console.log,
    save: async (personId, filing, person) => {
      if (flags['dry-run']) return filing.trades.length;
      if (flags.prod) {
        sent.push({ ...filing, bioguideId: person.bioguideId ?? undefined });
        return filing.trades.length;
      }
      const { storeFiling } = await import('@/server/services/personTrades');
      return storeFiling(personId, filing);
    },
  });
  console.log(`${result.trades} trades in ${result.filings} filings`);
  if (result.failed.length) console.warn(result.failed.join('\n'));
  if (result.unmatched.length) console.log(`No page for: ${result.unmatched.join('; ')}`);
  if (flags.prod && !flags['dry-run']) {
    if (!flags['token-file']) throw new Error('--prod needs --token-file');
    const headers = { Authorization: `Bearer ${readFileSync(flags['token-file'], 'utf8').trim()}`, 'Content-Type': 'application/json' };
    for (let i = 0; i < sent.length; i += 25) {
      const res = await fetch(`${flags.base}/api/admin/person-trades`, { method: 'POST', headers, body: JSON.stringify({ filings: sent.slice(i, i + 25) }) });
      console.log(res.status, await res.text());
    }
  }
}
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
