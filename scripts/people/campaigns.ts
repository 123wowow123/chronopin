// Loads campaign finance for members of Congress from the FEC's bulk files
// (see src/server/services/personCampaignsImport.ts).
//
//   npm run people:campaigns [-- --cycles 2022,2024,2026] [--dry-run]
//   --prod --token-file <admin token file>   POST to /api/admin/person-campaigns
//
// The midnight job's personCampaigns task runs it once after each quarterly
// FEC filing deadline.

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import PersonCampaign from '@/server/model/personCampaign';
import { importCampaigns } from '@/server/services/personCampaignsImport';

const { values: flags } = parseArgs({
  options: {
    cycles: { type: 'string', default: '2022,2024,2026' },
    'dry-run': { type: 'boolean', default: false },
    prod: { type: 'boolean', default: false },
    base: { type: 'string', default: 'https://www.chronopin.com' },
    'token-file': { type: 'string' },
  },
});

async function main() {
  const { byPerson, unmatched, skippedCycles } = await importCampaigns({ cycles: flags.cycles.split(',').map(Number), log: console.log });
  console.log(`${byPerson.size} people with campaign data; ${unmatched.length} with none in these cycles (retired earlier or never ran)`);
  if (skippedCycles.length) console.log(`No FEC files yet for ${skippedCycles.join(', ')}`);
  if (flags['dry-run']) return;
  if (flags.prod) {
    if (!flags['token-file']) throw new Error('--prod needs --token-file');
    const headers = { Authorization: `Bearer ${readFileSync(flags['token-file'], 'utf8').trim()}`, 'Content-Type': 'application/json' };
    const bioguides = new Map((await db.query<{ id: number; bioguideId: string }>(`SELECT "id", "bioguideId" FROM "Person" WHERE "bioguideId" IS NOT NULL`)).map((r) => [r.id, r.bioguideId]));
    const entries = [...byPerson].filter(([id]) => bioguides.has(id)).map(([id, cycles]) => ({ bioguideId: bioguides.get(id), cycles }));
    for (let i = 0; i < entries.length; i += 20) {
      const res = await fetch(`${flags.base}/api/admin/person-campaigns`, { method: 'POST', headers, body: JSON.stringify({ people: entries.slice(i, i + 20) }) });
      console.log(res.status, await res.text());
    }
    return;
  }
  for (const [id, cycles] of byPerson) await PersonCampaign.replace(id, cycles);
  console.log('saved');
}
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
