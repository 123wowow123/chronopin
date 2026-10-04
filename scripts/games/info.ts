// Reads game pins' maturity rating, platforms and Steam/Metacritic scores
// (src/server/gameFacts.ts), as a new game pin's save does.
//
//   npm run games:info                      what would be stored, every game pin (scores need no Steam page)
//   npm run games:info -- --ids 5455,5456   these pins
//   npm run games:info -- --apply           store them in this database
//   npm run games:info -- --out info.json   write [{pinId, body}] to PUT to another database's
//                                           /api/pins/:id/game-info (prod: see login-from-env-local)

import '../env';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { findGameFacts } from '@/server/gameFacts';
import { inCategories } from '@/server/model/pinTag';
import { saveGameInfo } from '@/server/model/pinGameInfo';
import Pin from '@/server/model/pin';
import { gameScoresOfPin, steamAppOfPin } from '@/server/services/gameInfo';
import { GAME_CATEGORIES } from '@/server/scrape/scoreMarkets';

const { values: flags } = parseArgs({
  options: { apply: { type: 'boolean', default: false }, ids: { type: 'string' }, out: { type: 'string' }, pause: { type: 'string', default: '800' } },
});
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const ids = flags.ids?.split(',').map(Number).filter(Number.isInteger);
  const rows = await db.query<{ id: number; title: string }>(
    `SELECT "Pin"."id", "Pin"."title" FROM "Pin"
     WHERE ${inCategories('$1')} AND "Pin"."utcDeletedDateTime" IS NULL
       ${ids?.length ? 'AND "Pin"."id" = ANY($2::int[])' : ''}
     ORDER BY "Pin"."id"`,
    ids?.length ? [GAME_CATEGORIES, ids] : [GAME_CATEGORIES],
  );
  console.log(`${flags.apply ? 'Updating' : 'Dry run over'} ${rows.length} game pins`);
  const posts: { pinId: number; body: Record<string, unknown> }[] = [];
  for (const { id, title } of rows) {
    const appId = await steamAppOfPin(id);
    const facts = appId ? await findGameFacts(appId) : undefined;
    // A game with no Steam page still has scores, found by its title.
    const ratings = await gameScoresOfPin(id, facts);
    await sleep(Number(flags.pause));
    if (!facts && !ratings.length) {
      console.log(`${id} ${title}: ${appId ? `Steam app ${appId} unreadable` : 'no Steam page, no scores'}`);
      continue;
    }
    const info = facts?.info;
    console.log(
      `${id} ${title}\n   ${appId ? `app ${appId}: ` : 'no Steam page: '}${info ? `${info.maturityBoard ?? '-'} ${info.maturityRating ?? '-'} [${info.descriptors.join(', ')}] | ${info.platforms.join(', ') || '-'} | ` : ''}${ratings.map((r) => `${r.source} ${r.score}`).join(', ') || 'no scores'}`,
    );
    posts.push({ pinId: id, body: { ...(info ?? {}), ...(facts ? { source: facts.source, sourceUrl: facts.sourceUrl } : {}), ratings } });
    if (flags.apply) {
      if (facts && info) await saveGameInfo(id, info, { source: facts.source, sourceUrl: facts.sourceUrl });
      if (ratings.length) await Pin.setRatings(id, ratings);
    }
  }
  if (flags.out) writeFileSync(flags.out, JSON.stringify(posts, null, 2));
  console.log(`${posts.length} pins with a reading${flags.apply ? ' stored' : ''}`);
  process.exit(0);
}
run();
