// A full job run: every daily job, one after another, in one go
// (docs/okf/scraping/daily-jobs.md#full-run). Each job still gets its own
// JobRun - its own limits, actions, learnings and report on /admin/jobs - the
// full run only chains them, whatever each one's schedule or enabled flag
// says. Three ways to start it:
//
//   - the admin page's "Run all now" and `npm run jobs:run -- --all`, which
//     run the jobs back to back on their drivers (runAllJobs);
//   - `npm run jobs:run -- --all --prepare`, which writes one prompt and one
//     MCP config for a Claude Code session in VS Code to work them all
//     (fullRunPrompt, begin_job and finish_job in scripts/jobs/mcp.ts).

import type { JobSetting } from '@/lib/dailyJobs';
import { holdSchedule } from '../services/dailyJobSchedule';
import { getDailyJobs } from '../model/appSetting';
import JobRun from '../model/jobRun';
import log from '../util/log';
import { runJob, type RunOptions } from './index';
import { kickoff, systemPrompt } from './prompt';

// The jobs a full run covers, in the order they are saved (midnight, news,
// monthly): all of them, or just `only` when it is given. A job id that is not
// configured is a mistake worth stopping for.
export async function fullRunJobs(only?: string[]): Promise<JobSetting[]> {
  const { jobs } = await getDailyJobs();
  if (!only?.length) return jobs;
  const unknown = only.filter((id) => !jobs.some((j) => j.id === id));
  if (unknown.length) throw new Error(`No such job: ${unknown.join(', ')} (configured: ${jobs.map((j) => j.id).join(', ')})`);
  return jobs.filter((j) => only.includes(j.id));
}

export type FullRunResult = { jobId: string; runId: number | null };

// Runs the jobs one at a time and resolves when the last ends. A job that
// fails is recorded on its own run and the rest still run; the scheduler is
// held off for the whole chain.
export async function runAllJobs(options: Omit<RunOptions, 'slot'>, only?: string[]): Promise<FullRunResult[]> {
  const jobs = await fullRunJobs(only);
  const stamp = new Date().toISOString();
  return holdSchedule(async () => {
    const results: FullRunResult[] = [];
    for (const job of jobs) {
      await JobRun.closeAbandoned();
      if (await JobRun.anyRunning()) {
        log.warn(`full run: ${job.id} not started, another job is running`);
        results.push({ jobId: job.id, runId: null });
        continue;
      }
      const runId = await runJob(job.id, { ...options, slot: `manual:full:${stamp}` }).catch((err) => {
        log.warn(`full run: ${job.id} failed to start:`, (err as Error).message);
        return null;
      });
      results.push({ jobId: job.id, runId });
    }
    return results;
  });
}

// The one prompt a session works from: the shared instructions once, then
// each job's own, in order, with the begin_job / finish_job steps between.
export async function fullRunPrompt(jobs: JobSetting[]): Promise<string> {
  const sections = await Promise.all(
    jobs.map(async (job, i) => {
      const ctx = { runId: 0, jobId: job.id, maxNewPins: job.maxNewPins, maxUpdates: job.maxUpdates, created: 0, updated: 0, since: await JobRun.lastFinished(job.id) };
      return `## Job ${i + 1} of ${jobs.length}: ${job.id}\n\nStart it with begin_job {"jobId": "${job.id}"}, and end it with finish_job.\n\n${await kickoff(job, ctx)}`;
    }),
  );
  return [
    await systemPrompt('session'),
    `# Full run\n\nWork all ${jobs.length} jobs below in one go, in this order: ${jobs.map((j) => j.id).join(', ')}. Each is its own run with its own limits and report. Call begin_job before a job's first tool, and finish_job with that job's report when its tasks are done - the chronopin tools refuse to run between jobs, and begin_job refuses to start while one is open. A job that cannot be finished (a tool is down, a source is blocked) still gets a finish_job saying why; go on to the next. When the last job is finished, say in one paragraph what the full run did.`,
    ...sections,
  ].join('\n\n---\n\n');
}
