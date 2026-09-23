// Runs one daily pin job (docs/okf/scraping/daily-jobs.md): claims its slot,
// builds its instructions from the OKF docs, hands them to a driver - the
// app's API key or a headless Claude Code session - and records what it did.
// Called by the schedule (../services/dailyJobSchedule.ts), the admin page's
// "Run now", and `npm run jobs:run`.

import { spawn } from 'node:child_process';
import { access, appendFile } from 'node:fs/promises';
import path from 'node:path';
import type { JobSetting } from '@/lib/dailyJobs';
import { getDailyJobs } from '../model/appSetting';
import JobRun, { type JobDriver } from '../model/jobRun';
import log from '../util/log';
import { LlmUnavailable, runWithApi, type DriverResult } from './drivers/api';
import { runWithSession, sessionAvailable } from './drivers/session';
import { kickoff, systemPrompt } from './prompt';
import { contextForRun, OKF_ROOT, type JobContext } from './tools';
import { getClient } from '../extract';

export type RunOptions = {
  trigger: 'schedule' | 'manual';
  // The scheduled slot's key; a manual run makes its own.
  slot?: string;
  userId?: number | null;
  driver?: 'auto' | JobDriver;
};

// The drivers to try, in order. auto prefers the app's key and falls back to
// a session when the key is missing, rejected or out of credit.
function driversFor(choice: 'auto' | JobDriver): JobDriver[] {
  if (choice !== 'auto') return [choice];
  return [...(getClient() ? (['api'] as const) : []), ...(sessionAvailable() ? (['session'] as const) : [])];
}

async function drive(driver: JobDriver, job: JobSetting, ctx: JobContext): Promise<DriverResult> {
  const [system, first] = await Promise.all([systemPrompt(driver), kickoff(job, ctx)]);
  await JobRun.setDriver(ctx.runId, driver);
  return driver === 'api' ? runWithApi(system, first, ctx) : runWithSession(system, first, ctx);
}

async function jobOf(jobId: string): Promise<JobSetting | undefined> {
  return (await getDailyJobs()).jobs.find((j) => j.id === jobId);
}

// Starts a run and resolves when it ends. Null when the slot was already
// claimed (another server has it) or the job does not exist.
export async function runJob(jobId: string, options: RunOptions): Promise<number | null> {
  const job = await jobOf(jobId);
  if (!job) return null;
  const runId = await JobRun.claim({
    jobId,
    slot: options.slot ?? `manual:${new Date().toISOString()}`,
    trigger: options.trigger,
    tasks: job.tasks,
    userId: options.userId ?? null,
  });
  if (!runId) return null;

  const ctx = await contextForRun(runId, job);
  const drivers = driversFor(options.driver ?? job.driver);
  log.info(`job ${jobId} run ${runId} starting (${options.trigger}, drivers ${drivers.join(', ') || 'none'})`);
  const unavailable: string[] = [];
  try {
    for (const driver of drivers) {
      try {
        const result = await drive(driver, job, ctx);
        await JobRun.finish(runId, { status: 'ok', report: result.report, usage: result.usage });
        await afterRun(runId);
        log.info(`job ${jobId} run ${runId} finished on ${driver}: ${ctx.created} created, ${ctx.updated} updated`);
        return runId;
      } catch (err) {
        if (!(err instanceof LlmUnavailable)) throw err;
        unavailable.push(`${driver}: ${err.message}`);
        log.warn(`job ${jobId} run ${runId}: ${driver} unavailable - ${err.message}`);
      }
    }
    await JobRun.finish(runId, {
      status: 'skipped',
      error: unavailable.length ? `No LLM was available. ${unavailable.join(' | ')}` : 'No driver is available: no ANTHROPIC_API_KEY and no Claude Code binary on this machine.',
    });
  } catch (err) {
    log.warn(`job ${jobId} run ${runId} failed:`, (err as Error).message);
    await JobRun.finish(runId, { status: 'failed', error: (err as Error).message });
  }
  return runId;
}

// What a finished run leaves behind outside its row: its learnings in the OKF
// log, and - on a development machine, after a run that wrote pins - the seed
// backup, because seeds are what production is rebuilt from.
async function afterRun(runId: number) {
  const run = await JobRun.get(runId);
  if (!run || process.env.NODE_ENV === 'production') return;
  if (run.learnings.length) {
    const file = path.join(OKF_ROOT, 'scraping', 'learnings.md');
    try {
      await access(file);
      const day = new Date(run.utcStartedDateTime).toISOString().slice(0, 10);
      const lines = run.learnings.map((l) => `* **Learned** (${l.topic}) ${l.text}`);
      await appendFile(file, `\n## ${day} - Daily job ${run.jobId}, run ${run.id} (${run.driver})\n\n${lines.join('\n')}\n`);
    } catch (err) {
      log.warn(`job run ${runId}: could not add its learnings to the OKF log:`, (err as Error).message);
    }
  }
  const wrote = run.actions.some((a) => a.tool === 'create_pin' || a.tool === 'update_pin');
  if (wrote) {
    await new Promise<void>((resolve) => {
      const child = spawn('npm', ['run', 'backup:data'], { cwd: process.cwd(), stdio: 'ignore' });
      child.on('close', (code) => {
        if (code) log.warn(`job run ${runId}: backup:data exited ${code}`);
        resolve();
      });
      child.on('error', (err) => {
        log.warn(`job run ${runId}: backup:data failed:`, err.message);
        resolve();
      });
    });
  }
}
