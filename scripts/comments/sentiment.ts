// Scores the tone of comments that have none yet (see
// src/server/extract/sentiment.ts). Posting or editing a comment scores it;
// this catches up on comments from before, or from while the API key had no
// credit. Scores are saved on the comment, so `npm run backup:data` keeps them.
//
//   npm run comments:sentiment                 every unscored comment
//   npm run comments:sentiment -- --limit 50   at most 50 of them
//   npm run comments:sentiment -- --dry-run    count them, call nothing
//
// Each comment is one Claude call. Pin pages pick the scores up on their next
// render after their cache expires.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { scoreComment } from '@/server/extract/sentiment';
import Comment from '@/server/model/comment';

const { values: flags } = parseArgs({
  options: { limit: { type: 'string' }, 'dry-run': { type: 'boolean' } },
});

async function run() {
  const ids = await Comment.unscoredIds(flags.limit ? Number(flags.limit) : 100_000);
  console.log(`${ids.length} unscored comment(s)`);
  if (flags['dry-run']) return;

  let scored = 0;
  for (const id of ids) {
    if ((await scoreComment(id)) != null) scored++;
    else console.log(`comment ${id}: not scored`);
  }
  console.log(`scored ${scored} of ${ids.length}`);
}

run()
  .catch((err) => {
    console.log('comments:sentiment failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
