// Tags the pins of frontier AI models "Frontier Model": a model is frontier
// when, among the models released in its year, nothing cheaper scores as high
// on the arena's text leaderboard (the grey line on a model pin's cost/quality
// chart, src/lib/modelChart.ts). Run it after the arena publishes or a model
// pin is added; it adds the tag to pins that are on the frontier and takes it
// off those that no longer are (a cheaper, stronger model displaced them).
//
//   npm run models:frontier-tag               sync the tag
//   npm run models:frontier-tag -- --dry-run  say what would change
//
// The tag is a form ("user") tag, so a save from the form keeps it and the
// auto-tag read after a save does not touch it. A pin is frontier when any
// model it is the pin of is: a family launch carries the tag for its best.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import PinTag from '@/server/model/pinTag';
import { buildModelChart, cachedModelUniverse, modelPinIndex } from '@/server/modelChart';
import log from '@/server/util/log';

export const FRONTIER_TAG = 'Frontier Model';

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
  const drop = [...tagged].filter((id) => !frontier.has(id));

  console.log(`${frontier.size} frontier pins; ${add.length} to tag, ${drop.length} to untag`);
  for (const id of add) console.log(`  + ${id}  ${frontier.get(id)!.join(', ')}`);
  for (const id of drop) console.log(`  - ${id}`);
  if (flags['dry-run']) return;

  for (const id of add) await PinTag.addUserTags(id, [FRONTIER_TAG]);
  if (drop.length) await db.query(`DELETE FROM "PinTag" WHERE "name" = $1 AND "pinId" = ANY($2::int[])`, [FRONTIER_TAG, drop]);
  console.log('done');
}

run()
  .catch((err) => {
    log.error('frontierTag', (err as Error)?.message);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
