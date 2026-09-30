// Prints a finished job run's writes as JSON, for replaying them on prod
// (scripts/jobs/post-run-to-prod.sh).
//
//   npm run --silent jobs:export -- <run id>

import '../env';
import * as db from '@/server/db';
import JobRun from '@/server/model/jobRun';

async function main() {
  const run = await JobRun.get(Number(process.argv[2]));
  if (!run) throw new Error('No such run');
  console.log(JSON.stringify({ id: run.id, jobId: run.jobId, status: run.status, actions: run.actions }));
  await db.closeConnection();
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
