// The daily jobs' tools (src/server/jobs/tools.ts) as an MCP server over
// stdio, for the session driver: the headless Claude Code a run starts
// (src/server/jobs/drivers/session.ts) launches this with the run's id, and
// every write it makes counts against that run's limits and is recorded on it.
//
//   tsx scripts/jobs/mcp.ts --run <JobRun id>
//   tsx scripts/jobs/mcp.ts --all [--jobs midnight,news]   a full run: begin_job / finish_job
//
// A Claude Code session in VS Code can use it too, to work a job by hand:
// start a run with `npm run jobs:run -- --job midnight --prepare`, then add
// this server with that run id. For every job in one session, start it with
// --all: no run is open until the session calls begin_job for a job (which
// opens that job's run then, so a long session never has a run waiting open),
// and finish_job closes it (src/server/jobs/fullRun.ts).
//
// The protocol is small enough to speak directly: newline-delimited JSON-RPC,
// with initialize, tools/list and tools/call.

import './stdoutGuard';
import '../env';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { getDailyJobs } from '@/server/model/appSetting';
import JobRun from '@/server/model/jobRun';
import { afterRun } from '@/server/jobs';
import { fullRunJobs } from '@/server/jobs/fullRun';
import { contextForRun, runTool, TOOLS, type JobContext } from '@/server/jobs/tools';

const { values: flags } = parseArgs({ options: { run: { type: 'string' }, all: { type: 'boolean', default: false }, jobs: { type: 'string' } } });

// A full run's session-only tools: they move this server from job to job.
const FULL_RUN_TOOLS = [
  {
    name: 'begin_job',
    description: 'Full run only: opens the run for the next job and makes the other chronopin tools work for it. Fails while a job is still open (finish_job it first) or another run is going.',
    inputSchema: { type: 'object', properties: { jobId: { type: 'string', description: 'The job to start, e.g. midnight' } }, required: ['jobId'], additionalProperties: false },
  },
  {
    name: 'finish_job',
    description: 'Full run only: closes the open job\'s run with its report (per task: what you checked, what you changed with pin ids, what you left and why). Answers with the jobs still to do.',
    inputSchema: { type: 'object', properties: { report: { type: 'string' }, failed: { type: 'boolean', description: 'True when the job could not be completed' } }, required: ['report'], additionalProperties: false },
  },
];

type FullRun = { remaining: string[]; stamp: string };

type Request = { jsonrpc: '2.0'; id?: number | string | null; method: string; params?: Record<string, any> };

function send(message: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
}

async function loadContext(): Promise<JobContext | null> {
  if (flags.all) return null;
  const runId = Number(flags.run);
  if (!Number.isInteger(runId) || runId < 1) throw new Error('Pass --run <JobRun id>');
  const run = await JobRun.get(runId);
  if (!run) throw new Error(`No job run ${runId}`);
  const job = (await getDailyJobs()).jobs.find((j) => j.id === run.jobId);
  return contextForRun(runId, job ?? { maxNewPins: 0, maxUpdates: 0 });
}

const text = (value: unknown, isError = false) => ({ text: typeof value === 'string' ? value : JSON.stringify(value), isError });

async function beginJob(full: FullRun, current: JobContext | null, jobId: unknown): Promise<{ ctx?: JobContext; result: { text: string; isError: boolean } }> {
  if (current) return { result: text(`Job ${current.jobId} (run ${current.runId}) is still open; call finish_job first.`, true) };
  if (typeof jobId !== 'string' || !full.remaining.includes(jobId)) {
    return { result: text(`Jobs still to do: ${full.remaining.join(', ') || 'none'}.`, true) };
  }
  await JobRun.closeAbandoned();
  if (await JobRun.anyRunning()) return { result: text('Another job run is open on this app; wait for it to finish or close it on /admin/jobs.', true) };
  const job = (await getDailyJobs()).jobs.find((j) => j.id === jobId);
  if (!job) return { result: text(`No job ${jobId}`, true) };
  const runId = await JobRun.claim({ jobId, slot: `manual:full:${full.stamp}`, trigger: 'manual', tasks: job.tasks, userId: null });
  if (!runId) return { result: text(`Job ${jobId} already has a run in this full run.`, true) };
  await JobRun.setDriver(runId, 'session');
  full.remaining = full.remaining.filter((id) => id !== jobId);
  const ctx = await contextForRun(runId, job);
  return { ctx, result: text({ runId, jobId, tasks: job.tasks, maxNewPins: job.maxNewPins, maxUpdates: job.maxUpdates, since: ctx.since }) };
}

async function finishJob(full: FullRun, current: JobContext | null, report: unknown, failed: unknown): Promise<{ closed: boolean; result: { text: string; isError: boolean } }> {
  if (!current) return { closed: false, result: text('No job is open; call begin_job first.', true) };
  const body = typeof report === 'string' && report.trim() ? report : 'Worked in a full-run Claude Code session.';
  await JobRun.finish(current.runId, failed ? { status: 'failed', error: body, report: body } : { status: 'ok', report: body });
  await afterRun(current.runId).catch((err) => console.error(`afterRun ${current.runId}:`, (err as Error).message));
  return { closed: true, result: text({ closedRun: current.runId, jobsRemaining: full.remaining }) };
}

async function main() {
  let ctx = await loadContext();
  const full: FullRun | null = flags.all
    ? { remaining: (await fullRunJobs(flags.jobs?.split(',').map((id) => id.trim()).filter(Boolean))).map((j) => j.id), stamp: new Date().toISOString() }
    : null;
  const lines = createInterface({ input: process.stdin });
  const pending = new Set<Promise<void>>();
  // begin_job and finish_job change which run the tools work for, so they go
  // in the order they came and every other call waits for the ones before it.
  let gate: Promise<void> = Promise.resolve();
  for await (const line of lines) {
    if (!line.trim()) continue;
    let request: Request;
    try {
      request = JSON.parse(line);
    } catch {
      send({ id: null, error: { code: -32700, message: 'Parse error' } });
      continue;
    }
    const { id, method, params } = request;
    // Notifications (no id) need no answer.
    if (id === undefined || id === null) continue;
    if (method === 'initialize') {
      send({
        id,
        result: {
          protocolVersion: params?.protocolVersion ?? '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'chronopin', version: '1.0.0' },
          instructions: ctx
            ? `Chronopin's daily-job tools for run ${ctx.runId} (${ctx.jobId}).`
            : `Chronopin's daily-job tools for a full run of: ${full?.remaining.join(', ')}. Call begin_job for each job, then finish_job.`,
        },
      });
    } else if (method === 'ping') {
      send({ id, result: {} });
    } else if (method === 'tools/list') {
      const tools = TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.input_schema }));
      send({ id, result: { tools: full ? [...FULL_RUN_TOOLS, ...tools] : tools } });
    } else if (method === 'tools/call') {
      const name = String(params?.name);
      const args = params?.arguments ?? {};
      // The job-switching tools run in turn: the next call must see the job
      // they opened or closed.
      if (full && (name === 'begin_job' || name === 'finish_job')) {
        const call = (gate = gate.then(async () => {
          const done = name === 'begin_job' ? await beginJob(full, ctx, args.jobId) : await finishJob(full, ctx, args.report, args.failed);
          if ('ctx' in done && done.ctx) ctx = done.ctx;
          if ('closed' in done && done.closed) ctx = null;
          send({ id, result: { content: [{ type: 'text', text: done.result.text }], isError: done.result.isError } });
        }).catch((err) => send({ id, result: { content: [{ type: 'text', text: (err as Error).message }], isError: true } })));
        pending.add(call);
        void call.finally(() => pending.delete(call));
        continue;
      }
      // Each call runs on its own, so a slow scrape does not hold up a count;
      // in a full run it first waits for any begin_job / finish_job before it.
      const call = gate.then(() =>
        ctx
          ? runTool(name, args, ctx).then(({ text, isError }) => send({ id, result: { content: [{ type: 'text', text }], isError } }))
          : send({ id, result: { content: [{ type: 'text', text: 'No job is open: call begin_job first.' }], isError: true } }),
      );
      pending.add(call);
      void call.finally(() => pending.delete(call));
    } else {
      send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  }
  // stdin closed: let the calls still running finish before the pool closes.
  await Promise.all(pending);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
