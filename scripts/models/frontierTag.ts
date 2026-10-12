// Tags the pins of frontier AI models "Frontier Model": a model is frontier
// when, among the models released in its year, nothing cheaper scores as high
// on the arena's text leaderboard (the grey line on a model pin's cost/quality
// chart, src/lib/modelChart.ts). New pins are tagged when they are created
// (src/server/services/frontierTag.ts); this catches up the ones that were
// there before that, or whose model was not priced yet when they were pinned.
// It only adds: a tag is never taken off, however the line moves later.
//
//   npm run models:frontier-tag               add the tag where it is missing
//   npm run models:frontier-tag -- --dry-run  say what would be added
//
// The tag is a form ("user") tag, so a save from the form keeps it. A pin is
// frontier when any model it is the pin of is: a family launch carries the
// tag for its best.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import PinTag from '@/server/model/pinTag';
import { FRONTIER_TAG } from '@/lib/modelChart';
import { buildModelChart, cachedModelUniverse, modelPinIndex } from '@/server/modelChart';
import log from '@/server/util/log';


const { values: flags } = parseArgs({ options: { 'dry-run': { type: 'boolean', default: false } } });

async function run() {
  const [universe, pins] = await Promise.all([cachedModelUniverse(), modelPinIndex()]);
  if (!universe) throw new Error('the arena or the price list could not be read; nothing changed');
  const chart = buildModelChart(universe, null, pins);
  const frontier = new Map<number, string[]>();
  for (const p of chart.points) {
    if (p.frontier && p.pinId != null) frontier.set(p.pinId, [...(frontier.get(p.pinId) ?? []), `${p.name} (${p.year})`]);
  }

  const tagged = new Set(
    (await db.query<{ pinId: number }>(`SELECT "pinId" FROM "PinTag" WHERE "name" = $1`, [FRONTIER_TAG])).map((r) => r.pinId),
  );
  const add = [...frontier.keys()].filter((id) => !tagged.has(id));

  console.log(`${frontier.size} frontier pins; ${add.length} to tag`);
  for (const id of add) console.log(`  + ${id}  ${frontier.get(id)!.join(', ')}`);
  if (flags['dry-run']) return;

  for (const id of add) await PinTag.addUserTags(id, [FRONTIER_TAG]);
  console.log('done');
}

run()
  .catch((err) => {
    log.error('frontierTag', (err as Error)?.message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
