// Prints a finished job run's writes as JSON, for replaying them on prod
// (scripts/jobs/post-run-to-prod.sh): its actions, and the sentiment scores
// it saved - record_sentiment's action names no pins, so those are the scores
// written while the run was open.
//
//   npm run --silent jobs:export -- <run id>

import '../env';
import * as db from '@/server/db';
import JobRun from '@/server/model/jobRun';

async function main() {
  const run = await JobRun.get(Number(process.argv[2]));
  if (!run) throw new Error('No such run');
  const sentiments = run.actions.some((a) => a.tool === 'record_sentiment')
    ? await db.query(
        `
      SELECT "pinId", "sentiment", "textHash", "product", "productHash", "utcScoredDateTime"
      FROM "PinSentiment"
      WHERE "utcScoredDateTime" BETWEEN $1 AND coalesce($2, now())
      ORDER BY "pinId"`,
        [run.utcStartedDateTime, run.utcFinishedDateTime],
      )
    : [];
  console.log(JSON.stringify({ id: run.id, jobId: run.jobId, status: run.status, actions: run.actions, sentiments }));
  await db.closeConnection();
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
