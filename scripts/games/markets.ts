// Adds Kalshi and Polymarket markets on a game to its pin as references
// (src/server/scrape/gameMarkets.ts), as a new game pin's scrape does.
//
//   npm run games:markets                     what would be added, every game pin
//   npm run games:markets -- --ids 5455,5456  these pins
//   npm run games:markets -- --apply          add them in this database
//   npm run games:markets -- --out m.json     write [{pinId, references}] to POST to another
//                                             database's /api/pins/:id/references (prod)
//
// A market counts only when its title names the game, so read the dry run's
// pairs before applying.

import '../env';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { inCategories } from '@/server/model/pinTag';
import { findGameMarkets } from '@/server/scrape/gameMarkets';
import { GAME_CATEGORIES } from '@/server/scrape/scoreMarkets';
import { addReferences } from '@/server/services/addReferences';

const { values: flags } = parseArgs({
  options: { apply: { type: 'boolean', default: false }, ids: { type: 'string' }, out: { type: 'string' }, pause: { type: 'string', default: '500' } },
});
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const ids = flags.ids?.split(',').map(Number).filter(Number.isInteger);
  const rows = await db.query<{ id: number; title: string; userId: number; names: string[] }>(
    `SELECT "Pin"."id", "Pin"."title", "Pin"."userId" FROM "Pin"
     WHERE ${inCategories('$1')} AND "Pin"."utcDeletedDateTime" IS NULL
       ${ids?.length ? 'AND "Pin"."id" = ANY($2::int[])' : ''}
     ORDER BY "Pin"."id"`,
    ids?.length ? [GAME_CATEGORIES, ids] : [GAME_CATEGORIES],
  );
  console.log(`${flags.apply ? 'Updating' : 'Dry run over'} ${rows.length} game pins`);
  const posts: { pinId: number; references: unknown[] }[] = [];
  for (const { id, title, userId } of rows) {
    const references = await findGameMarkets({ pinTitle: title });
    await sleep(Number(flags.pause));
    if (!references.length) continue;
    console.log(`${id} ${title}`);
    references.forEach((r) => console.log(`   ${r.url}  (${r.title})`));
    posts.push({ pinId: id, references });
    if (flags.apply) await addReferences(id, references, userId);
  }
  if (flags.out) writeFileSync(flags.out, JSON.stringify(posts, null, 2));
  console.log(`${posts.length} pins with markets${flags.apply ? ' updated' : ''}`);
  process.exit(0);
}
run();
