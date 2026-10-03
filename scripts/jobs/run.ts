// Runs a daily pin job now, from the terminal, against the running app
// (docs/okf/scraping/daily-jobs.md). The same run the schedule and the admin
// page's "Run now" start, recorded on /admin/jobs.
//
//   npm run jobs:run -- --job midnight
//   npm run jobs:run -- --job news --driver session    on Claude Code's login, not the API key
//
// Or work a job by hand in a Claude Code session in VS Code, on that
// session's own credit:
//
//   npm run jobs:run -- --job midnight --prepare       opens a run, writes its prompt and MCP config
//   ...add the MCP server it prints, follow the prompt...
//   npm run jobs:run -- --finish <run id> --report report.md
//
// Every job in one go - one session working them all, or back to back:
//
//   npm run jobs:run -- --all --prepare                one prompt + MCP config for a VS Code session
//   npm run jobs:run -- --all --driver session         headless, each job on Claude Code's login
//   npm run jobs:run -- --all --jobs midnight,news     only those jobs
//
// The app must be running (JOBS_API_BASE, default http://127.0.0.1:3000):
// every write goes through its API as a curator.

import '../env';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { runJob } from '@/server/jobs';
import { fullRunJobs, fullRunPrompt, runAllJobs } from '@/server/jobs/fullRun';
import { kickoff, systemPrompt } from '@/server/jobs/prompt';
import { contextForRun } from '@/server/jobs/tools';
import { apiBase } from '@/server/jobs/pinApi';
import { getDailyJobs } from '@/server/model/appSetting';
import JobRun from '@/server/model/jobRun';

const { values: flags } = parseArgs({
  options: {
    job: { type: 'string' },
    all: { type: 'boolean', default: false },
    jobs: { type: 'string' },
    driver: { type: 'string' },
    prepare: { type: 'boolean', default: false },
    finish: { type: 'string' },
    report: { type: 'string' },
    // Where --prepare writes the prompt and MCP config.
    out: { type: 'string', default: tmpdir() },
  },
});

async function prepare(jobId: string) {
  const job = (await getDailyJobs()).jobs.find((j) => j.id === jobId);
  if (!job) throw new Error(`No job ${jobId}`);
  const runId = await JobRun.claim({ jobId, slot: `manual:${new Date().toISOString()}`, trigger: 'manual', tasks: job.tasks, userId: null });
  if (!runId) throw new Error('Could not open a run');
  await JobRun.setDriver(runId, 'session');
  const ctx = await contextForRun(runId, job);
  const prompt = `${await systemPrompt('session')}\n\n---\n\n${await kickoff(job, ctx)}`;
  const promptFile = path.resolve(flags.out!, `job-${runId}.md`);
  const mcpFile = path.resolve(flags.out!, `job-${runId}.mcp.json`);
  await writeFile(promptFile, prompt);
  await writeFile(
    mcpFile,
    JSON.stringify({ mcpServers: { chronopin: { command: path.resolve('node_modules/.bin/tsx'), args: [path.resolve('scripts/jobs/mcp.ts'), '--run', String(runId)], env: { JOBS_API_BASE: apiBase() } } } }, null, 2),
  );
  console.log(`Opened run ${runId} (${jobId}).`);
  console.log(`Prompt:     ${promptFile}`);
  console.log(`MCP config: ${mcpFile}`);
  console.log(`Add the tools to Claude Code with:\n  claude mcp add chronopin -- ${path.resolve('node_modules/.bin/tsx')} ${path.resolve('scripts/jobs/mcp.ts')} --run ${runId}`);
  console.log(`When done: npm run jobs:run -- --finish ${runId} --report <file>`);
}

// One prompt and one MCP config for a session to work every job: no run is
// opened here, the session's begin_job opens each as it gets there.
async function prepareAll(only?: string[]) {
  const jobs = await fullRunJobs(only);
  const promptFile = path.resolve(flags.out!, 'job-full.md');
  const mcpFile = path.resolve(flags.out!, 'job-full.mcp.json');
  const args = [path.resolve('scripts/jobs/mcp.ts'), '--all', ...(only?.length ? ['--jobs', only.join(',')] : [])];
  await writeFile(promptFile, await fullRunPrompt(jobs));
  await writeFile(mcpFile, JSON.stringify({ mcpServers: { chronopin: { command: path.resolve('node_modules/.bin/tsx'), args, env: { JOBS_API_BASE: apiBase() } } } }, null, 2));
  console.log(`Full run of ${jobs.map((j) => j.id).join(', ')}.`);
  console.log(`Prompt:     ${promptFile}`);
  console.log(`MCP config: ${mcpFile}`);
  console.log(`Add the tools to Claude Code with:\n  claude mcp add chronopin -- ${path.resolve('node_modules/.bin/tsx')} ${args.join(' ')}`);
  console.log('Each job closes itself with finish_job; nothing to --finish.');
}

async function runAll(driver: 'auto' | 'api' | 'session' | undefined, only?: string[]) {
  for (const { jobId, runId } of await runAllJobs({ trigger: 'manual', driver }, only)) {
    const result = runId ? await JobRun.get(runId) : null;
    console.log(`${jobId}: ${result ? `run ${runId} ${result.status} on ${result.driver ?? 'no driver'} (${result.actions.length} actions)` : 'not run'}`);
    if (result?.error) console.log(`  ${result.error}`);
  }
}

async function finish(runId: number) {
  const report = flags.report ? await readFile(flags.report, 'utf8') : 'Worked by hand in a Claude Code session.';
  await JobRun.finish(runId, { status: 'ok', report });
  console.log(`Closed run ${runId}.`);
}

async function run() {
  if (flags.finish) return finish(Number(flags.finish));
  const only = flags.jobs?.split(',').map((id) => id.trim()).filter(Boolean);
  if (flags.all && flags.job) throw new Error('--all runs every job; use --jobs a,b to pick some, or --job for one');
  if (flags.all && flags.prepare) return prepareAll(only);
  if (!flags.all && !flags.job) throw new Error('Pass --job <id> (see /admin/jobs), --all, or --finish <run id>');
  const driver = flags.driver as 'auto' | 'api' | 'session' | undefined;
  if (driver && !['auto', 'api', 'session'].includes(driver)) throw new Error('--driver is auto, api or session');
  if (flags.all) return runAll(driver, only);
  if (flags.prepare) return prepare(flags.job!);
  const runId = await runJob(flags.job!, { trigger: 'manual', driver });
  if (!runId) throw new Error(`No job ${flags.job}`);
  const result = await JobRun.get(runId);
  console.log(`Run ${runId}: ${result?.status} on ${result?.driver ?? 'no driver'}`);
  for (const a of result?.actions ?? []) console.log(`  ${a.tool}${a.pinId ? ` #${a.pinId}` : ''}${a.title ? ` ${a.title}` : ''}: ${a.detail}`);
  if (result?.error) console.log(`\n${result.error}`);
  if (result?.report) console.log(`\n${result.report}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
