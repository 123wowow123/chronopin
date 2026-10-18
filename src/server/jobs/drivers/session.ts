// The session driver: the job's model is a headless Claude Code on this
// machine, running on whatever account Claude Code is logged in with - the
// same login the VS Code extension uses - instead of the app's API key (the
// "session credit" half of docs/okf/scraping/daily-jobs.md#drivers).
//
// Claude Code brings its own web search, web fetch and PDF and image reading;
// the app's tools reach it through an MCP server (scripts/jobs/mcp.ts) that
// it starts itself, pointed at this run. Nothing else is allowed: no shell,
// no file edits.
//
// It needs the `claude` binary and the repo's scripts, so it is for the
// machine the code is checked out on, not the production image.

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { MAX_RUN_MS } from '../../model/jobRun';
import { apiBase } from '../pinApi';
import type { JobContext } from '../tools';
import { LlmUnavailable, type DriverResult } from './api';

const MCP_NAME = 'chronopin';

// CLAUDE_CODE_BIN, else `claude` on the PATH, else the newest copy the VS Code
// extension ships. Null when there is none. The lookups are outside the
// project, so they are kept out of the build's file tracing
// (turbopackIgnore), which would otherwise copy the whole repo into the
// standalone output.
export function findClaudeBinary(): string | null {
  if (process.env.CLAUDE_CODE_BIN) return existsSync(/*turbopackIgnore: true*/ process.env.CLAUDE_CODE_BIN) ? process.env.CLAUDE_CODE_BIN : null;
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    const candidate = path.join(/*turbopackIgnore: true*/ dir, 'claude');
    if (dir && existsSync(/*turbopackIgnore: true*/ candidate)) return candidate;
  }
  for (const root of ['.vscode/extensions', '.vscode-insiders/extensions', '.cursor/extensions']) {
    const extensions = path.join(/*turbopackIgnore: true*/ homedir(), root);
    if (!existsSync(/*turbopackIgnore: true*/ extensions)) continue;
    const found = readdirSync(/*turbopackIgnore: true*/ extensions)
      .filter((name) => name.startsWith('anthropic.claude-code-'))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map((name) => path.join(/*turbopackIgnore: true*/ extensions, name, 'resources', 'native-binary', 'claude'))
      .find((file) => existsSync(/*turbopackIgnore: true*/ file));
    if (found) return found;
  }
  return null;
}

export function sessionAvailable(): boolean {
  return !!findClaudeBinary() && existsSync(path.join(process.cwd(), 'scripts', 'jobs', 'mcp.ts'));
}

type ResultMessage = { type: 'result'; subtype: string; is_error?: boolean; result?: string; total_cost_usd?: number; num_turns?: number; usage?: Record<string, unknown>; duration_ms?: number };

export async function runWithSession(system: string, kickoff: string, ctx: JobContext): Promise<DriverResult> {
  const binary = findClaudeBinary();
  if (!binary) throw new LlmUnavailable('No Claude Code binary found (set CLAUDE_CODE_BIN, or install the CLI or the VS Code extension)');
  const root = process.cwd();
  const tsx = path.join(root, 'node_modules', '.bin', 'tsx');
  const dir = await mkdtemp(path.join(tmpdir(), 'chronopin-job-'));
  try {
    const mcpFile = path.join(dir, 'mcp.json');
    await writeFile(
      mcpFile,
      JSON.stringify({
        mcpServers: {
          [MCP_NAME]: { command: tsx, args: [path.join(root, 'scripts', 'jobs', 'mcp.ts'), '--run', String(ctx.runId)], env: { JOBS_API_BASE: apiBase() } },
        },
      }),
    );
    const args = [
      '-p',
      kickoff,
      '--output-format',
      'json',
      // Appended to Claude Code's own prompt, which is what teaches it its
      // tools; about 40KB, well inside the argument limit.
      '--append-system-prompt',
      system,
      '--mcp-config',
      mcpFile,
      '--strict-mcp-config',
      '--allowedTools',
      `mcp__${MCP_NAME}`,
      'WebSearch',
      'WebFetch',
      '--disallowedTools',
      'Bash',
      'Edit',
      'Write',
      'NotebookEdit',
      // Anything not allowed above is refused rather than waiting on a prompt
      // nobody is there to answer.
      '--permission-mode',
      'dontAsk',
      '--no-session-persistence',
    ];
    // Without an API key in its environment Claude Code uses its own login,
    // which is the point: the app's key may have no credit.
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    delete env.ANTHROPIC_AUTH_TOKEN;

    const { stdout, stderr, code } = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
      const child = spawn(/*turbopackIgnore: true*/ binary, args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (err += d));
      const timer = setTimeout(() => child.kill('SIGTERM'), MAX_RUN_MS - 5 * 60 * 1000);
      child.on('error', reject);
      child.on('close', (exit) => {
        clearTimeout(timer);
        resolve({ stdout: out, stderr: err, code: exit });
      });
    });

    const result = stdout
      .trim()
      .split('\n')
      .reverse()
      .map((line) => {
        try {
          return JSON.parse(line) as ResultMessage;
        } catch {
          return null;
        }
      })
      .find((m) => m?.type === 'result');
    if (!result) {
      const why = (stderr || stdout).trim().slice(-1500) || `exit code ${code}`;
      if (/log ?in|not logged|authenticat|\/login/i.test(why)) throw new LlmUnavailable(`Claude Code is not logged in: ${why}`);
      throw new Error(`Claude Code ended without a result: ${why}`);
    }
    if (result.is_error || result.subtype !== 'success') {
      throw new Error(`Claude Code run ended with ${result.subtype}: ${(result.result ?? stderr).slice(0, 1500)}`);
    }
    return {
      report: result.result ?? '',
      usage: { binary, turns: result.num_turns, durationMs: result.duration_ms, costUsdIfBilled: result.total_cost_usd, ...(result.usage ?? {}) },
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
