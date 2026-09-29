// Threads existing anime pins the way a new pin now is: each season (or later
// pin about the same work) as a response to the one before it, found by
// MyAnimeList id and AniList's prequels (src/server/scrape/prequel.ts). A pin
// with no parent is given one, and a pin answering an earlier season of its
// show moves to a closer one (Season 3 from Season 1 to a newly pinned
// Season 2); a response to anything else was its author's choice and stays.
//
//   npm run threads:prequels                  list what would change
//   npm run threads:prequels -- --apply       change it
//   npm run threads:prequels -- --ids 1750 --apply
//
// Writes "parentId" alone, straight to the database: pin pages already
// cached show the new thread when their cache runs out (hours), or at once
// after a dev server restart. Then `npm run backup:data` to keep it.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { animePins, betterParent, relatedWorks, setParent, type RelationCache } from '@/server/scrape/prequel';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    ids: { type: 'string' },
  },
});

async function run() {
  const only = new Set(flags.ids?.split(',').map(Number).filter(Number.isInteger));
  const pins = (await animePins()).filter((p) => !only.size || only.has(p.id));
  const cache: RelationCache = new Map();
  // Every chain fetched up front, 50 works a request, so the walks below
  // never ask AniList again.
  if (!(await relatedWorks([...new Set(pins.map((p) => p.malId))], 'prequels', cache, { patient: true }))) {
    throw new Error('AniList did not answer');
  }
  console.log(`${flags.apply ? 'Threading' : 'Dry run over'} ${pins.length} anime pins`);

  let changed = 0;
  // Oldest first, so each finds the ones before it already in place.
  for (const pin of pins) {
    const parent = await betterParent(pin, cache);
    if (!parent) continue;
    changed++;
    console.log(`${pin.id} ${pin.title}\n    ${pin.parentId ? `moves from ${pin.parentId} to` : 'responds to'} ${parent.id} ${parent.title}`);
    if (flags.apply) await setParent(pin.id, parent.id);
  }
  console.log(`${flags.apply ? 'Threaded' : 'Would thread'} ${changed} pins`);
}

run()
  .catch((err) => {
    console.log('Prequel threads err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
