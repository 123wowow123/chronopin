// The daily jobs' tools (src/server/jobs/tools.ts) as an MCP server over
// stdio, for the session driver: the headless Claude Code a run starts
// (src/server/jobs/drivers/session.ts) launches this with the run's id, and
// every write it makes counts against that run's limits and is recorded on it.
//
//   tsx scripts/jobs/mcp.ts --run <JobRun id>
//
// A Claude Code session in VS Code can use it too, to work a job by hand:
// start a run with `npm run jobs:run -- --job midnight --prepare`, then add
// this server with that run id.
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
import { contextForRun, runTool, TOOLS, type JobContext } from '@/server/jobs/tools';

const { values: flags } = parseArgs({ options: { run: { type: 'string' } } });

type Request = { jsonrpc: '2.0'; id?: number | string | null; method: string; params?: Record<string, any> };

function send(message: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
}

async function loadContext(): Promise<JobContext> {
  const runId = Number(flags.run);
  if (!Number.isInteger(runId) || runId < 1) throw new Error('Pass --run <JobRun id>');
  const run = await JobRun.get(runId);
  if (!run) throw new Error(`No job run ${runId}`);
  const job = (await getDailyJobs()).jobs.find((j) => j.id === run.jobId);
  return contextForRun(runId, job ?? { maxNewPins: 0, maxUpdates: 0 });
}

async function main() {
  const ctx = await loadContext();
  const lines = createInterface({ input: process.stdin });
  const pending = new Set<Promise<void>>();
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
          instructions: `Chronopin's daily-job tools for run ${ctx.runId} (${ctx.jobId}).`,
        },
      });
    } else if (method === 'ping') {
      send({ id, result: {} });
    } else if (method === 'tools/list') {
      send({ id, result: { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.input_schema })) } });
    } else if (method === 'tools/call') {
      // Each call runs on its own, so a slow scrape does not hold up a count.
      const call = runTool(String(params?.name), params?.arguments ?? {}, ctx).then(({ text, isError }) =>
        send({ id, result: { content: [{ type: 'text', text }], isError } }),
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
